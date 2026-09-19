import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getServices } from '@app';
import {
  CURRENT_USER_QUERY_KEY,
  UserService,
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

  // Проекты пользователя и приглашения в ожидании ответа: GET /users/me/projects/.
  const {
    data: myProjects,
    isPending: isProjectsPending,
    isError: isProjectsError,
  } = useQuery({
    queryKey: ['currentUserProjects'],
    queryFn: () => userService.getMyProjects(),
    enabled: !!user, // не запускаем, пока нет user
  });

  const projectCards = useMemo(
    () => toProjectCards(myProjects?.memberships ?? []),
    [myProjects]
  );

  // Приглашения, ожидающие ответа пользователя, в виде пунктов блока «В ожидании ответа».
  const waitingItems = useMemo(
    () =>
      (myProjects?.invitations ?? []).map(
        ({ id, project_title, project_role_name }) => ({
          id,
          title: project_title,
          tag: project_role_name,
        })
      ),
    [myProjects]
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
    updateNotifications: updateNotifications.mutate,
    isNotificationUpdating: updateNotifications.isPending,
    isNotificationUpdateError: updateNotifications.isError,
    updateVisibility: updateVisibility.mutate,
    isVisibilityUpdating: updateVisibility.isPending,
    isVisibilityUpdateError: updateVisibility.isError,
  };
};
