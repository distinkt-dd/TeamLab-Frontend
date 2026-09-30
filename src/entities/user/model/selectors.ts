import type { RootState } from '@app';

export const selectCurrentUser = (state: RootState) => state.user.currentUser;
export const selectUserLoading = (state: RootState) => state.user.loading;
export const selectUserError = (state: RootState) => state.user.error;
export const selectUsers = (state: RootState) => {
  console.log('state.user =', state.user);
  return state.user.users;
};
