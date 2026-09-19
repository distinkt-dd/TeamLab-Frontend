import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getServices } from '@app';
import {
  CURRENT_USER_QUERY_KEY,
  UserService,
  useOptimisticUserUpdate,
} from '@entities/user';
import { ProjectService } from '@entities/project';
import { toProjectCards } from '../lib/toProjectCards';

// Данные личного кабинета владельца: текущий пользователь, его проекты
// и отклики, ожидающие ответа.
export const useMyProfileOwner = () => {
  const { api } = getServices();
  const queryClient = useQueryClient();
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

  // Отклики на проекты владельца, ожидающие решения: GET /users/me/notifications/.
  const {
    data: notifications,
    isPending: isWaitingPending,
    isError: isWaitingError,
  } = useQuery({
    queryKey: ['currentUserNotifications'],
    queryFn: () => userService.getNotifications(),
    enabled: !!user, // не запускаем, пока нет user
  });

  // Имя откликнувшегося и специализация роли — пункт блока «В ожидании ответа».
  const waitingItems = useMemo(
    () =>
      (notifications ?? []).map(({ id, username, project_role_name }) => ({
        id,
        title: username,
        tag: project_role_name,
      })),
    [notifications]
  );

  // Включение/выключение уведомлений: PATCH /users/me/.
  const updateNotifications = useOptimisticUserUpdate(
    userService,
    queryClient,
    (enabled: boolean) => ({ notification_enabled: enabled })
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
  };
};
