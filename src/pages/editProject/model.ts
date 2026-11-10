import type {
  ProjectDetail,
  ProjectRole,
  ProjectStatus,
} from '@entities/project/types';

export interface ProjectSkillDraft {
  id: number | null;
  clientId: string;
  skillId: number;
  name: string;
  description: string;
  order: number;
}

export interface ProjectRoleDraft {
  id: number | null;
  clientId: string;
  specializationId: number;
  specializationName: string;
  tasks: string[];
  skills: ProjectSkillDraft[];
  benefits: string[];
}

export interface EditProjectDraft {
  projectId: number;
  fieldId: number;
  title: string;
  description: string;
  problem: string;
  status: ProjectStatus;
  roles: ProjectRoleDraft[];
  deletedRoleIds: number[];
}

const toRoleDraft = (role: ProjectRole): ProjectRoleDraft => ({
  id: role.id,
  clientId: `role-${role.id}`,
  specializationId: role.specialization_id,
  specializationName: role.specialization_name ?? '',
  tasks: [...role.tasks],
  skills: [...role.skills]
    .sort((first, second) => first.order - second.order)
    .map((skill) => ({
      id: skill.id,
      clientId: `skill-${skill.id}`,
      skillId: skill.skill_id,
      name: skill.name,
      description: skill.description,
      order: skill.order,
    })),
  benefits: [...role.benefits],
});

export const toEditProjectDraft = (
  project: ProjectDetail
): EditProjectDraft => ({
  projectId: project.id,
  fieldId: project.field_id,
  title: project.title,
  description: project.description,
  problem: project.problem ?? '',
  status: project.status,
  roles: project.roles.map(toRoleDraft),
  deletedRoleIds: [],
});
