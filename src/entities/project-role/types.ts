export interface ProjectRoleSkill {
  id: number;
  skill_id: number;
  name: string;
  description: string;
  order: number;
}

export interface ProjectRoleSkillInput {
  skill_id: number;
  description: string;
  order: number;
}

export interface ProjectRolePreview {
  id: number;
  specialization_id: number;
  specialization_name: string | null;
  skills: ProjectRoleSkill[];
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

export interface ProjectRoleCreateInput {
  specialization_id: number;
  tasks: string[];
  benefits: string[];
  skills: ProjectRoleSkillInput[];
}

export interface ProjectRoleCreateRequest {
  project_id: number;
  specialization_id: number;
  tasks: string[];
  benefits: string[];
  skills: ProjectRoleSkillInput[];
}

export interface ProjectRoleUpdateRequest {
  specialization_id?: number;
  tasks?: string[];
  benefits?: string[];
  skills?: ProjectRoleSkillInput[];
}
