export interface SocialLinks {
  instagram?: string;
  telegram?: string;
  github?: string;
  behance?: string;
  vk?: string;
}

export interface PortfolioWork {
  id: number;
  user_id: number;
  title: string;
  task: string | null;
  solution: string | null;
  image: string | null;
  technologies: string[] | null;
  link: string | null;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: number;
  user_id: number;
  skill_id: number;
  name: string;
  level: string;
  created_at: string;
  updated_at: string;
}

export type WorkFormat = 'remote' | 'hybrid';
export type EmploymentType = 'full_time' | 'part_time' | 'combined';
export type SearchStatus =
  | 'looking_for_team'
  | 'looking_for_members'
  | 'not_looking';
export type AccountType = 'participant' | 'owner';
export type ProfileVisibility = 'public' | 'matched_only' | 'hidden';
export type UserLevel = 'junior' | 'middle' | 'senior';

export interface UserPublic {
  id: number;
  username: string;
  display_name: string;
  bio: string | null;
  avatar: string | null;
  specialization_id: number | null;
  specialization_name: string | null;
  level: UserLevel | null;
  workload_hours_per_week: number | null;
  work_format: WorkFormat | null;
  employment_type: EmploymentType | null;
  search_status: SearchStatus | null;
  city: string | null;
  contacts_visible: boolean;
  social_links: SocialLinks | null;
  created_at?: string;
  updated_at?: string;
  skills: Skill[];
  portfolio_works: PortfolioWork[];
}

export interface UserPublicMock {
  id: number;
  username: string;
  display_name: string;
  avatar: string | null;
  specialization_id: number | null;
  specialization_name?: string | null; // не у всех есть, поэтому опционально
  level: UserLevel | null; // в моках всегда null, но тип совместим с UserLevel
  city: string;
  workload_hours_per_week: number | null;
  work_format: string | null; // можно заменить на WorkFormat, если знаете enum
  employment_type: EmploymentType | null; // аналогично
  search_status: string | null; // аналогично
  skills: MockSkill[]; // массив с полной структурой
}

interface MockSkill {
  id: number;
  user_id: number;
  skill_id: number;
  name: string;
  level: string;
  created_at: string;
  updated_at: string;
}

export interface CurrentUser extends UserPublic {
  email: string;
  account_type: AccountType;
  profile_visibility: ProfileVisibility;
  notification_enabled: boolean;
  owned_project_ids: number[];
}

export interface PaginatedUsers {
  count: number;
  next: string | null;
  previous: string | null;
  results: UserPublic[];
}

export interface UserCreateRequest {
  username: string;
  display_name: string;
  email: string;
  password: string;
  account_type: AccountType;
  specialization_id: number;
}

export interface UserUpdateRequest {
  display_name?: string;
  city?: string;
  workload_hours_per_week?: number;
  work_format?: WorkFormat;
  employment_type?: EmploymentType;
  search_status?: SearchStatus;
}

export interface AvatarUpdateRequest {
  avatar: string;
}

export interface AvatarResponse {
  avatar: string;
}

export interface SetPasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  field_id?: number;
  specialization_ids?: string;
  skill_ids?: string;
  level?: UserLevel;
  city?: string;
  work_format?: WorkFormat;
  employment_type?: EmploymentType;
  search_status?: SearchStatus;
  ordering?: string;

  [key: string]: string | number | undefined;
}
