export interface RolePreview {
  id: number;
  specialization_id: number;
  specialization_name: string | null;
}

export interface ProjectPreview {
  id: number;
  title: string;
  image: string | null;
  roles_preview: RolePreview[];
}

export interface FavoriteProject {
  id: number;
  user_id: number;
  project_id: number;
  created_at: string;
}

export interface FavoriteProjectCreateRequest {
  project_id: number;
}
