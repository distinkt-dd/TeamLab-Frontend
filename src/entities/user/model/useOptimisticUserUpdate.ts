import { useMutation, type QueryClient } from '@tanstack/react-query';
import type { UserService } from '../UserService';
import type { CurrentUser, UserUpdateRequest } from '../types';

// Ключ кэша текущего пользователя: используется и в запросах, и в мутациях настроек.
export const CURRENT_USER_QUERY_KEY = ['currentUser'];

export const useOptimisticUserUpdate = <TValue>(
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
