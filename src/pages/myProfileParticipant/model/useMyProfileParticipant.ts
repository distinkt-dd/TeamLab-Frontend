import { useMemo } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { getServices } from '@app';
import { ProjectService } from '@entities/project';
import { UserService } from '@entities/user';
import type {
  CurrentUser,
  ProfileVisibility,
  UserUpdateRequest,
} from '@entities/user/types';
import { toProjectCards } from '../lib/toProjectCards';

// Общий ключ кэша текущего пользователя: используется и в запросе, и в мутации.
const CURRENT_USER_QUERY_KEY = ['currentUser'];

// Точечное обновление текущего пользователя (PATCH /users/me/).
// Кэш обновляем оптимистично, при ошибке возвращаем предыдущее значение.
const useOptimisticUserUpdate = <TValue>(
  userService: UserService,
  queryClient: QueryClient,
  toPatch: (value: TValue) => UserUpdateRequest
) =>
  useMutation({
    mutationFn: (value: TValue) => userService.updateCurrent(toPatch(value)),
    onMutate: async (value) => {
      await queryClient.cancelQueries({ queryKey: CURRENT_USER_QUERY_KEY });
      const previousUser = queryClient.getQueryData<CurrentUser>(
        CURRENT_USER_QUERY_KEY
      );

      queryClient.setQueryData<CurrentUser>(
        CURRENT_USER_QUERY_KEY,
        (current) => (current ? { ...current, ...toPatch(value) } : current)
      );

      return { previousUser };
    },
    onError: (_error, _value, context) => {
      if (context) {
        queryClient.setQueryData(CURRENT_USER_QUERY_KEY, context.previousUser);
      }
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, updatedUser);
    },
  });

// Данные личного кабинета участника: текущий пользователь и его проекты.
export const useMyProfileParticipant = () => {
  const { api } = getServices();
  const queryClient = useQueryClient();
  const userService = useMemo(() => new UserService(api), [api]);
  const projectService = useMemo(() => new ProjectService(api), [api]);

  const {
    data: user,
    isPending: isUserPending,
    isError: isUserError,
  } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => userService.getCurrent(),
  });

  // ID проектов пользователя: нужен и для ключа кэша, и для запроса
  const projectIds = user?.owned_project_ids ?? [];

  const {
    data: projects,
    isPending: isProjectsPending,
    isError: isProjectsError,
  } = useQuery({
    // ключ включает отсортированный список ID — это важно для корректного кэша
    queryKey: ['userProjects', [...projectIds].sort((a, b) => a - b)],
    // Параллельная загрузка всех проектов по ID
    queryFn: () =>
      Promise.all(projectIds.map((id) => projectService.getProjectDetail(id))),
    enabled: !!user, // не запускаем, пока нет user
  });

  const projectCards = useMemo(
    () => toProjectCards(projects ?? []),
    [projects]
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
    updateNotifications: updateNotifications.mutate,
    isNotificationUpdating: updateNotifications.isPending,
    isNotificationUpdateError: updateNotifications.isError,
    updateVisibility: updateVisibility.mutate,
    isVisibilityUpdating: updateVisibility.isPending,
    isVisibilityUpdateError: updateVisibility.isError,
  };
};
