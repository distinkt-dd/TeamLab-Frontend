import type { RootState } from '@app';

export const selectCurrentUser = (state: RootState) => state.user.currentUser;
export const selectUserLoading = (state: RootState) => state.user.loading;
export const selectUserError = (state: RootState) => state.user.error;
export const selectUsers = (state: RootState) => state.user.users;
export const selectUsersNextPage = (state: RootState) =>
  state.user.usersNextPage;
