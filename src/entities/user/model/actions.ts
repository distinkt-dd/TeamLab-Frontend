import { createAsyncThunk } from '@reduxjs/toolkit';
import { getServices } from '@app';
import { UserService } from '@entities/user';
import type {
  CurrentUser,
  UserUpdateRequest,
  AvatarUpdateRequest,
  AvatarResponse,
  SetPasswordRequest,
  ListUsersParams,
  PaginatedUsers,
  UserCreateRequest,
  UserPublic,
} from '@entities/user/types';

const getUserService = () => new UserService(getServices().api);

const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return 'Неизвестная ошибка';
};

//Получить список пользователей
export const fetchUsers = createAsyncThunk<
  PaginatedUsers,
  ListUsersParams | void,
  { rejectValue: string }
>('user/fetchUsers', async (params, { rejectWithValue }) => {
  try {
    return await getUserService().list(params ?? undefined);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

//Зарегать пользователя
export const registerUser = createAsyncThunk<
  CurrentUser,
  UserCreateRequest,
  { rejectValue: string }
>('user/registerUser', async (data, { rejectWithValue }) => {
  try {
    return await getUserService().create(data);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

//Получить инфу у пользователе с определенным id
export const fetchUserById = createAsyncThunk<
  UserPublic,
  number,
  { rejectValue: string }
>('user/fetchUserById', async (userId, { rejectWithValue }) => {
  try {
    return await getUserService().retrieve(userId);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

//Получить пользователя
export const fetchCurrentUser = createAsyncThunk<
  CurrentUser,
  void,
  { rejectValue: string }
>('user/fetchCurrentUser', async (_, { rejectWithValue }) => {
  try {
    return await getUserService().getCurrent();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

//Обновить пользователя
export const updateCurrentUser = createAsyncThunk<
  CurrentUser,
  UserUpdateRequest,
  { rejectValue: string }
>('user/updateCurrentUser', async (data, { rejectWithValue }) => {
  try {
    return await getUserService().updateCurrent(data);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

//Добавить аватарку
export const uploadUserAvatar = createAsyncThunk<
  AvatarResponse,
  AvatarUpdateRequest,
  { rejectValue: string }
>('user/uploadAvatar', async (data, { rejectWithValue }) => {
  try {
    return await getUserService().uploadAvatar(data);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

//Удалить аватарку
export const deleteUserAvatar = createAsyncThunk<
  void,
  void,
  { rejectValue: string }
>('user/deleteAvatar', async (_, { rejectWithValue }) => {
  try {
    await getUserService().deleteAvatar();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

//Установить пароль
export const setUserPassword = createAsyncThunk<
  void,
  SetPasswordRequest,
  { rejectValue: string }
>('user/setPassword', async (data, { rejectWithValue }) => {
  try {
    await getUserService().setPassword(data);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});
