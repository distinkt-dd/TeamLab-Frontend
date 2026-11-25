import type {
  ProjectCardItem,
  ProjectCardMember,
  ProjectDetail,
  ProjectMemberCard,
  ProjectRole,
} from '@entities/project/types';

const toProjectMember = (
  role: ProjectRole,
  members: ProjectMemberCard[]
): ProjectCardMember => ({
  roleId: role.id,
  roleName: role.specialization_name ?? 'Роль без названия',
  participants: Array.from(
    new Map(
      members
        .filter((member) => member.project_role_id === role.id)
        .map((member) => [
          member.user_id,
          { id: member.user_id, name: member.username },
        ])
    ).values()
  ),
});

export const toProjectCards = (projects: ProjectDetail[]): ProjectCardItem[] =>
  projects.map((project) => {
    const members = project.members ?? [];

    return {
      id: project.id,
      name: project.title,
      image: project.image ?? undefined,
      tags: [],
      members: project.roles.map((role) => toProjectMember(role, members)),
    };
  });
