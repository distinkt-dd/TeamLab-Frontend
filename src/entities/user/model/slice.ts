import type { CurrentUser, UserPublic } from '@entities/user/types';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { getNextPageNumber } from '@shared/api/pagination';
import {
  deleteUserAvatar,
  fetchCurrentUser,
  fetchUserById,
  fetchUsers,
  registerUser,
  setUserPassword,
  updateCurrentUser,
  uploadUserAvatar,
} from './actions';

interface UserState {
  currentUser: CurrentUser | null;
  users: UserPublic[] | null;
  usersNextPage: number | null;
  viewedUser: UserPublic | null;
  loading: boolean;
  error: string | null;
  pendingRequestIds: string[];
  privateRequestIds: string[];
}

const initialState: UserState = {
  currentUser: null,
  users: null,
  usersNextPage: null,
  viewedUser: null,
  loading: false,
  error: null,
  pendingRequestIds: [],
  privateRequestIds: [],
};

const beginRequest = (
  state: { pendingRequestIds: string[]; privateRequestIds: string[] },
  requestId: string,
  isPrivate = false
): void => {
  state.pendingRequestIds.push(requestId);
  if (isPrivate) state.privateRequestIds.push(requestId);
};

const finishRequest = (
  state: { pendingRequestIds: string[]; privateRequestIds: string[] },
  requestId: string
): boolean => {
  const requestIndex = state.pendingRequestIds.indexOf(requestId);
  if (requestIndex === -1) return false;

  state.pendingRequestIds.splice(requestIndex, 1);
  const privateRequestIndex = state.privateRequestIds.indexOf(requestId);
  if (privateRequestIndex !== -1) {
    state.privateRequestIds.splice(privateRequestIndex, 1);
  }
  return true;
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setCurrentUser: (state, action: PayloadAction<CurrentUser>) => {
      state.currentUser = action.payload;
      state.loading = false;
      state.error = null;
    },
    clearCurrentUser: (state) => {
      state.currentUser = null;
      state.loading = false;
      state.error = null;
    },
    resetUserState: (state) => {
      const publicRequestIds = state.pendingRequestIds.filter(
        (requestId) => !state.privateRequestIds.includes(requestId)
      );

      return {
        ...initialState,
        users: state.users,
        usersNextPage: state.usersNextPage,
        viewedUser: state.viewedUser,
        pendingRequestIds: publicRequestIds,
        privateRequestIds: [],
      };
    },
  },
  extraReducers: (builder) => {
    builder
      //Получить список пользователей
      .addCase(fetchUsers.pending, (state, action) => {
        beginRequest(state, action.meta.requestId);
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        if (!finishRequest(state, action.meta.requestId)) return;
        const isNextPage = (action.meta.arg?.page ?? 1) > 1;
        const users = isNextPage
          ? [...(state.users ?? []), ...action.payload.results]
          : action.payload.results;
        state.users = Array.from(
          new Map(users.map((user) => [user.id, user])).values()
        );
        state.usersNextPage = getNextPageNumber(action.payload.next);
        state.loading = false;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        if (!finishRequest(state, action.meta.requestId)) return;
        state.loading = false;
        state.error = action.payload ?? 'Failed to fetch users';
      })

      //Зарегать пользователя
      .addCase(registerUser.pending, (state, action) => {
        beginRequest(state, action.meta.requestId, true);
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        if (!finishRequest(state, action.meta.requestId)) return;
        state.currentUser = action.payload;
        state.loading = false;
      })
      .addCase(registerUser.rejected, (state, action) => {
        if (!finishRequest(state, action.meta.requestId)) return;
        state.loading = false;
        state.error = action.payload ?? 'Failed to register user';
      })

      //Получить инфу у пользователе с определенным id
      .addCase(fetchUserById.pending, (state, action) => {
        beginRequest(state, action.meta.requestId);
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        if (!finishRequest(state, action.meta.requestId)) return;
        state.viewedUser = action.payload;
        state.loading = false;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        if (!finishRequest(state, action.meta.requestId)) return;
        state.loading = false;
        state.error = action.payload ?? 'Failed to fetch user by id';
      })

      //Получить пользователя
      .addCase(fetchCurrentUser.pending, (state, action) => {
        beginRequest(state, action.meta.requestId, true);
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        if (!finishRequest(state, action.meta.requestId)) return;
        state.currentUser = action.payload;
        state.loading = false;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        if (!finishRequest(state, action.meta.requestId)) return;
        state.loading = false;
        state.error = action.payload ?? 'Failed to fetch user';
      })

      //Обновить пользователя
      .addCase(updateCurrentUser.pending, (state, action) => {
        beginRequest(state, action.meta.requestId, true);
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCurrentUser.fulfilled, (state, action) => {
        if (!finishRequest(state, action.meta.requestId)) return;
        state.currentUser = action.payload;
        state.loading = false;
      })
      .addCase(updateCurrentUser.rejected, (state, action) => {
        if (!finishRequest(state, action.meta.requestId)) return;
        state.loading = false;
        state.error = action.payload ?? 'Failed to update user';
      })

      //Добавить аватарку
      .addCase(uploadUserAvatar.pending, (state, action) => {
        beginRequest(state, action.meta.requestId, true);
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadUserAvatar.fulfilled, (state, action) => {
        if (!finishRequest(state, action.meta.requestId)) return;
        if (state.currentUser) {
          state.currentUser.avatar = action.payload.avatar;
        }
        state.loading = false;
      })
      .addCase(uploadUserAvatar.rejected, (state, action) => {
        if (!finishRequest(state, action.meta.requestId)) return;
        state.loading = false;
        state.error = action.payload ?? 'Failed to upload avatar';
      })

      //Удалить аватарку
      .addCase(deleteUserAvatar.pending, (state, action) => {
        beginRequest(state, action.meta.requestId, true);
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteUserAvatar.fulfilled, (state, action) => {
        if (!finishRequest(state, action.meta.requestId)) return;
        if (state.currentUser) {
          state.currentUser.avatar = null;
        }
        state.loading = false;
      })
      .addCase(deleteUserAvatar.rejected, (state, action) => {
        if (!finishRequest(state, action.meta.requestId)) return;
        state.loading = false;
        state.error = action.payload ?? 'Failed to delete avatar';
      })

      //Установить пароль
      .addCase(setUserPassword.pending, (state, action) => {
        beginRequest(state, action.meta.requestId, true);
        state.loading = true;
        state.error = null;
      })
      .addCase(setUserPassword.fulfilled, (state, action) => {
        if (!finishRequest(state, action.meta.requestId)) return;
        state.loading = false;
      })
      .addCase(setUserPassword.rejected, (state, action) => {
        if (!finishRequest(state, action.meta.requestId)) return;
        state.loading = false;
        state.error = action.payload ?? 'Failed to set password';
      });
  },
});

export const { setCurrentUser, clearCurrentUser, resetUserState } =
  userSlice.actions;
export default userSlice.reducer;
