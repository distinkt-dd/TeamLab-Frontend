import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getServices } from '@app';
import {
  CURRENT_USER_QUERY_KEY,
  UserService,
  currentUserApplicationsQueryKey,
  currentUserProjectsQueryKey,
  useOptimisticUserUpdate,
} from '@entities/user';
import type { ProfileVisibility } from '@entities/user/types';
import { toProjectCards } from '../lib/toProjectCards';

// Данные личного кабинета участника: текущий пользователь и его проекты.
export const useMyProfileParticipant = () => {
  const { api } = getServices();
  const queryClient = useQueryClient();
  const userService = useMemo(() => new UserService(api), [api]);

  const {
    data: user,
    isPending: isUserPending,
    isError: isUserError,
  } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => userService.getCurrent(),
  });

  // Активные проекты пользователя: GET /users/me/projects/.
  const {
    data: myProjects,
    isPending: isProjectsPending,
    isError: isProjectsError,
  } = useQuery({
    queryKey: currentUserProjectsQueryKey(user?.id ?? 0),
    queryFn: () => userService.getMyProjects(),
    enabled: !!user, // не запускаем, пока нет user
  });

  // Исходящие отклики участника, ожидающие решения владельца.
  const {
    data: applications,
    isPending: isWaitingPending,
    isError: isWaitingError,
  } = useQuery({
    queryKey: currentUserApplicationsQueryKey(user?.id ?? 0),
    queryFn: () => userService.getAllApplications({ status: 'pending' }),
    enabled: !!user,
  });

  const projectCards = useMemo(
    () => toProjectCards(myProjects?.memberships ?? []),
    [myProjects]
  );

  // Только исходящие pending-заявки; входящие приглашения отображаются в Header.
  const waitingItems = useMemo(
    () =>
      (applications ?? [])
        .filter(
          ({ source, status }) =>
            source === 'application' && status === 'pending'
        )
        .map(({ id, project_id, project_title, project_role_name }) => ({
          id,
          title: project_title,
          tag: project_role_name,
          href:
            Number.isInteger(project_id) && project_id > 0
              ? `/projects/${project_id}`
              : undefined,
        })),
    [applications]
  );

  // Включение/выключение уведомлений: PATCH /users/me/.
  const updateNotifications = useOptimisticUserUpdate(
    userService,
    queryClient,
    (enabled: boolean) => ({ notification_enabled: enabled })
  );

  // Видимость профиля: PATCH /users/me/.
  const updateVisibility = useOptimisticUserUpdate(
    userService,
    queryClient,
    (visibility: ProfileVisibility) => ({ profile_visibility: visibility })
  );

  return {
    user,
    isUserPending,
    isUserError,
    projectCards,
    isProjectsPending,
    isProjectsError,
    waitingItems,
    isWaitingPending,
    isWaitingError,
    updateNotifications: updateNotifications.mutate,
    isNotificationUpdating: updateNotifications.isPending,
    isNotificationUpdateError: updateNotifications.isError,
    updateVisibility: updateVisibility.mutate,
    isVisibilityUpdating: updateVisibility.isPending,
    isVisibilityUpdateError: updateVisibility.isError,
  };
};
