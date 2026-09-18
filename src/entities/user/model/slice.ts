import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CurrentUser, UserPublic } from '@entities/user/types';
import {
  fetchCurrentUser,
  updateCurrentUser,
  uploadUserAvatar,
  deleteUserAvatar,
  setUserPassword,
  fetchUsers,
  registerUser,
  fetchUserById,
} from './actions';

interface UserState {
  currentUser: CurrentUser | null;
  users: UserPublic[] | null;
  viewedUser: UserPublic | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  currentUser: null,
  users: null,
  viewedUser: null,
  loading: false,
  error: null,
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
  },
  extraReducers: (builder) => {
    builder
      //Получить список пользователей
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.users = action.payload.results;
        state.loading = false;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to fetch users';
      })

      //Зарегать пользователя
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.currentUser = action.payload;
        state.loading = false;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to register user';
      })

      //Получить инфу у пользователе с определенным id
      .addCase(fetchUserById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.viewedUser = action.payload;
        state.loading = false;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to fetch user by id';
      })

      //Получить пользователя
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.currentUser = action.payload;
        state.loading = false;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to fetch user';
      })

      //Обновить пользователя
      .addCase(updateCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCurrentUser.fulfilled, (state, action) => {
        state.currentUser = action.payload;
        state.loading = false;
      })
      .addCase(updateCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to update user';
      })

      //Добавить аватарку
      .addCase(uploadUserAvatar.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadUserAvatar.fulfilled, (state, action) => {
        if (state.currentUser) {
          state.currentUser.avatar = action.payload.avatar;
        }
        state.loading = false;
      })
      .addCase(uploadUserAvatar.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to upload avatar';
      })

      //Удалить аватарку
      .addCase(deleteUserAvatar.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteUserAvatar.fulfilled, (state) => {
        if (state.currentUser) {
          state.currentUser.avatar = null;
        }
        state.loading = false;
      })
      .addCase(deleteUserAvatar.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to delete avatar';
      })

      //Установить пароль
      .addCase(setUserPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(setUserPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(setUserPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to set password';
      });
  },
});

export const { setCurrentUser, clearCurrentUser } = userSlice.actions;
export default userSlice.reducer;
