import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { FavoriteProject } from '../types';
import {
  createFavoriteProjects,
  deleteFavoriteProjects,
  fetchFavoriteProjects,
} from './actions';

interface FavoriteProjectsState {
  projects: FavoriteProject[];
  loading: boolean;
  error: string | null;
}

const initialState: FavoriteProjectsState = {
  projects: [],
  loading: false,
  error: null,
};

export const favoriteProjectsSlice = createSlice({
  name: 'favorite-projects',
  initialState,
  reducers: {
    clearFavoriteProjectsState: (state) => {
      state.error = null;
      state.loading = false;
      state.projects = [];
    },

    // Локальное удаление - для отображения в интерфейсе!
    deleteFavoriteProjectById: (
      state,
      action: PayloadAction<{ id: number }>
    ) => {
      state.projects = state.projects.filter(
        (project) => project.id !== action.payload.id
      );
    },
  },

  extraReducers: (builder) => {
    // Получение списка избранных проектов
    builder
      .addCase(fetchFavoriteProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFavoriteProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.projects = action.payload;
      })
      .addCase(fetchFavoriteProjects.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload ?? 'Ошибка получения списка избранных проектов!';
      })
      // Создание избранного проекта (нажатие на сердце)
      .addCase(createFavoriteProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createFavoriteProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.projects.push(action.payload);
      })
      .addCase(createFavoriteProjects.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload ?? 'Ошибка добавления проекта в избранное!';
      })
      // Удаление проекта из избранного
      .addCase(deleteFavoriteProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteFavoriteProjects.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(deleteFavoriteProjects.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload ?? 'Ошибка удаление проекта из избранного!';
      });
  },
});

export const { deleteFavoriteProjectById, clearFavoriteProjectsState } =
  favoriteProjectsSlice.actions;
export default favoriteProjectsSlice.reducer;
