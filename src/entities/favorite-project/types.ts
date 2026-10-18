import type { ProjectListItem } from '@entities/project/types';

export interface FavoriteProject {
  id: number;
  user_id: number;
  project_id: number;
  project: ProjectListItem;
  created_at: string;
}

export interface FavoriteProjectCreateRequest {
  project_id: number;
}

export interface FavoriteProjectCreateResponse {
  id: number;
  user_id: number;
  project_id: number;
  created_at: string;
}
