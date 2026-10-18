import { useMutation, type QueryClient } from '@tanstack/react-query';
import { getServices } from '@app';
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
      const sessionGeneration = getServices().auth.getSessionGeneration();
      await queryClient.cancelQueries({ queryKey: CURRENT_USER_QUERY_KEY });

      const previousUser = queryClient.getQueryData<CurrentUser>(
        CURRENT_USER_QUERY_KEY
      );

      queryClient.setQueryData<CurrentUser>(
        CURRENT_USER_QUERY_KEY,
        (current) => (current ? { ...current, ...toPatch(value) } : current)
      );

      return { previousUser, sessionGeneration };
    },
    onError: (_error, _value, context) => {
      if (
        context &&
        context.sessionGeneration === getServices().auth.getSessionGeneration()
      ) {
        queryClient.setQueryData(CURRENT_USER_QUERY_KEY, context.previousUser);
      }
    },
    onSuccess: (updatedUser, _value, context) => {
      if (
        context.sessionGeneration === getServices().auth.getSessionGeneration()
      ) {
        queryClient.setQueryData(CURRENT_USER_QUERY_KEY, updatedUser);
      }
    },
  });
