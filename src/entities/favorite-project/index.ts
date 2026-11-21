export { FavoriteProjectService } from './FavoriteProjectService';
export type {
  FavoriteProject,
  FavoriteProjectCreateRequest,
  FavoriteProjectCreateResponse,
} from './types';

// Ключ запроса избранного: страница «Избранные проекты» читает его,
// страница проекта инвалидирует после добавления или удаления.
export const FAVORITE_PROJECTS_QUERY_KEY = ['favorite-projects'];
