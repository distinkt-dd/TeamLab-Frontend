import { getServices } from '@app';
import { ProjectService } from '@entities/project';
import {
  CURRENT_USER_QUERY_KEY,
  UserService,
  currentUserNotificationsQueryKey,
  ownerPendingInvitationsQueryKey,
} from '@entities/user';
import type { ProjectInvitationCard } from '@entities/project/types';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { toProjectCards } from '../lib/toProjectCards';

interface OwnerPendingInvitation extends ProjectInvitationCard {
  projectId: number;
}

// Данные личного кабинета владельца: текущий пользователь, его проекты,
// входящие заявки и отправленные приглашения, ожидающие ответа.
export const useMyProfileOwner = () => {
  const { api } = getServices();
  const userService = useMemo(() => new UserService(api), [api]);
  const projectService = useMemo(() => new ProjectService(api), [api]);

  // Текущий пользователь с типом owner (GET /users/me/).
  const {
    data: user,
    isPending: isUserPending,
    isError: isUserError,
  } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => userService.getCurrent(),
  });

  // Проекты владельца: их ID приходят в owned_project_ids,
  // детали добираем из GET /projects/{id}/.
  const {
    data: projects,
    isPending: isProjectsPending,
    isError: isProjectsError,
  } = useQuery({
    // ключ включает отсортированный список ID — это важно для корректного кэша
    queryKey: [
      'userProjects',
      [...(user?.owned_project_ids ?? [])].sort((a, b) => a - b),
    ],
    queryFn: async () => {
      const ids = user?.owned_project_ids ?? [];
      if (ids.length === 0) return [];

      // Параллельная загрузка всех проектов по ID
      const promises = ids.map((id) => projectService.getProjectDetail(id));
      return Promise.all(promises);
    },
    enabled: !!user && Array.isArray(user.owned_project_ids), // не запускаем, пока нет user
  });

  const projectCards = useMemo(
    () => toProjectCards(projects ?? []),
    [projects]
  );

  // Входящие заявки остаются источником счётчика отдельной страницы «Заявки».
  const { data: notifications } = useQuery({
    queryKey: currentUserNotificationsQueryKey(user?.id ?? 0),
    queryFn: () => userService.getAllNotifications(),
    enabled: !!user, // не запускаем, пока нет user
  });

  const projectIds = useMemo(
    () => [...(user?.owned_project_ids ?? [])].sort((a, b) => a - b),
    [user?.owned_project_ids]
  );

  // Исходящие pending-приглашения собираются по всем проектам владельца.
  const {
    data: invitations,
    isPending: isWaitingPending,
    isError: isWaitingError,
  } = useQuery({
    queryKey: [...ownerPendingInvitationsQueryKey(user?.id ?? 0), projectIds],
    queryFn: async (): Promise<OwnerPendingInvitation[]> => {
      const projectInvitations = await Promise.all(
        projectIds.map(async (projectId) => {
          const items =
            await projectService.getAllProjectInvitations(projectId);
          return items.map((invitation) => ({ ...invitation, projectId }));
        })
      );

      return Array.from(
        new Map(
          projectInvitations
            .flat()
            .filter(
              ({ source, status }) =>
                source === 'invitation' && status === 'pending'
            )
            .map((invitation) => [invitation.id, invitation])
        ).values()
      );
    },
    enabled: !!user,
  });

  const projectTitles = useMemo(
    () =>
      new Map((projects ?? []).map((project) => [project.id, project.title])),
    [projects]
  );

  // Имя приглашённого участника и контекст проекта/роли.
  const waitingItems = useMemo(
    () =>
      (invitations ?? []).map(
        ({ id, user_id, username, project_role_name, projectId }) => ({
          id,
          title: username,
          tag: [projectTitles.get(projectId), project_role_name]
            .filter(Boolean)
            .join(' · '),
          href:
            Number.isInteger(user_id) && user_id > 0
              ? `/participants/${user_id}`
              : undefined,
        })
      ),
    [invitations, projectTitles]
  );

  const pendingRequestsCount = useMemo(
    () =>
      (notifications ?? []).filter(
        ({ source, status }) => source === 'application' && status === 'pending'
      ).length,
    [notifications]
  );

  return {
    user,
    isUserPending,
    isUserError,
    projectCards,
    isProjectsPending,
    isProjectsError,
    waitingItems,
    pendingRequestsCount,
    isWaitingPending,
    isWaitingError,
  };
};
