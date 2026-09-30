import { getServices } from '@app';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { getErrorMessage } from '@shared/api/errors.handlers';
import { FavoriteProjectService } from '../FavoriteProjectService';
import type { FavoriteProject, FavoriteProjectCreateRequest } from '../types';

const getFavoriteProjectsService = () =>
  new FavoriteProjectService(getServices().api);

export const fetchFavoriteProjects = createAsyncThunk<
  FavoriteProject[],
  void,
  { rejectValue: string }
>('favorite-projects/get-list', async (_, { rejectWithValue }) => {
  try {
    return await getFavoriteProjectsService().list();
  } catch (err) {
    return rejectWithValue(getErrorMessage(err));
  }
});

export const createFavoriteProjects = createAsyncThunk<
  FavoriteProject,
  FavoriteProjectCreateRequest,
  { rejectValue: string }
>('favorite-projects/create', async (data, { rejectWithValue }) => {
  try {
    return await getFavoriteProjectsService().create(data);
  } catch (err) {
    return rejectWithValue(getErrorMessage(err));
  }
});

export const deleteFavoriteProjects = createAsyncThunk<
  void,
  number,
  { rejectValue: string }
>('favorite-projects/delete', async (id, { rejectWithValue }) => {
  try {
    return await getFavoriteProjectsService().delete(id);
  } catch (err) {
    return rejectWithValue(getErrorMessage(err));
  }
});
