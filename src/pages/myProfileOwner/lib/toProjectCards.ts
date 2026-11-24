import type {
  ProjectCardItem,
  ProjectCardMember,
  ProjectDetail,
  ProjectMemberCard,
  ProjectRole,
} from '@entities/project/types';

// Имя участника: в интерфейсе показываем display_name, а если он не заполнен —
// username, под которым пользователь входит в систему.
const getParticipantName = (member: ProjectMemberCard): string =>
  member.display_name || member.username;

// Строка карточки по роли: роли с активным участием получают имена участников,
// роли без участия остаются свободными вакансиями.
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
          { id: member.user_id, name: getParticipantName(member) },
        ])
    ).values()
  ),
});

// Приводит проекты владельца из GET /projects/{id}/ к виду, который ожидает
// виджет списка проектов. Роли проекта становятся строками «роль → участник»,
// поэтому специализации в тегах не дублируются.
//
// Участники берутся из `project.members`, которое бэкенд отдаёт только владельцу;
// роль без активных участников остаётся свободной вакансией.
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
