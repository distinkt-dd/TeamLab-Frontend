import type { UserPublic } from '@entities/user/types';

export interface PaginationParams {
  page?: number;
  limit?: number;

  [key: string]: string | number | undefined;
}

export type ProjectStatus = 'open' | 'closed';
export type RoleInterestStatus = 'pending' | 'accepted' | 'rejected';
export type RoleInterestSource = 'application' | 'invitation';
export type ProjectMembershipStatus = 'active' | 'left' | 'removed';

export interface ProjectRoleSkill {
  id: number;
  skill_id: number;
  name: string;
  description: string;
  order: number;
}

export interface ProjectRolePreview {
  id: number;
  specialization_id: number;
  specialization_name: string | null;
  skills: ProjectRoleSkill[];
}

export interface ProjectListItem {
  id: number;
  owner_id: number;
  field_id: number;
  title: string;
  description: string;
  problem: string | null;
  image: string | null;
  status: ProjectStatus;
  is_favorited: boolean;
  roles_preview: ProjectRolePreview[];
  created_at: string;
  updated_at: string;
}

export interface ProjectCardItem {
  id: number;
  name: string;
  image?: string;
  tags: string[];
}

export interface ProjectRole {
  id: number;
  project_id: number;
  specialization_id: number;
  specialization_name: string | null;
  tasks: string[];
  benefits: string[];
  skills: ProjectRoleSkill[];
  created_at: string;
  updated_at: string;
}

export interface ProjectRoleSkillInput {
  skill_id: number;
  description: string;
  order: number;
}

export interface ProjectRoleCreateInput {
  specialization_id: number;
  tasks: string[];
  benefits: string[];
  skills: ProjectRoleSkillInput[];
}

export interface GetProjectsParams extends PaginationParams {
  search?: string;
  status?: ProjectStatus;
  field_id?: number;
  specialization_ids?: string;
  skill_ids?: string;
  ordering?: string;
}

export interface PaginatedProjects {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProjectListItem[];
}

export interface ProjectCreateRequest {
  field_id: number;
  title: string;
  description: string;
  problem: string | null;
  image: string | null;
  roles: ProjectRoleCreateInput[];
}

export interface ProjectDetail {
  id: number;
  owner_id: number;
  field_id: number;
  title: string;
  description: string;
  problem: string | null;
  image: string | null;
  status: ProjectStatus;
  is_favorited: boolean;
  roles: ProjectRole[];
  matching_role_id: number | null;
  matching_role_name: string | null;
  my_interest_id: number | null;
  my_interest_status: RoleInterestStatus | null;
  my_interest_source: RoleInterestSource | null;
  my_membership_id: number | null;
  my_membership_status: ProjectMembershipStatus | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectUpdateRequest {
  field_id?: number;
  title?: string;
  description?: string;
  problem?: string | null;
  image?: string | null;
  status?: ProjectStatus;
}

export interface ProjectApplicationCard {
  id: number;
  project_role_id: number;
  project_role_name: string | null;
  status: RoleInterestStatus;
  source: RoleInterestSource;
  created_at: string;
  updated_at: string;
  user: UserPublic;
}

export interface CurrentUserApplicationCard {
  id: number;
  user_id: number;
  project_id: number;
  project_title: string;
  project_role_id: number;
  project_role_name: string | null;
  status: RoleInterestStatus;
  source: RoleInterestSource;
  created_at: string;
  updated_at: string;
}

export interface ProjectInvitationCard {
  id: number;
  user_id: number;
  username: string;
  project_role_id: number;
  project_role_name: string | null;
  status: RoleInterestStatus;
  source: RoleInterestSource;
  created_at: string;
  updated_at: string;
}

export interface ProjectInvitationCreateRequest {
  user_id: number;
}
