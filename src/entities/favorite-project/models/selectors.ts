import type { RootState } from '@app';

export const selectFavoriteProjects = (state: RootState) =>
  state.favoriteProjects.projects;

export const selectFavoriteProjectsError = (state: RootState) =>
  state.favoriteProjects.error;

export const selectFavoriteProjectsLoading = (state: RootState) =>
  state.favoriteProjects.loading;
