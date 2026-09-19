import type { ProjectCardItem } from '@entities/project/types';
import type { CurrentUserMembershipProjectCard } from '@entities/user/types';

// Приводит проекты участника из GET /users/me/projects/ к виду, который ожидает
// виджет списка проектов. У участия в поле id лежит идентификатор участия,
// поэтому для перехода на карточку проекта берём project_id.
export const toProjectCards = (
  memberships: CurrentUserMembershipProjectCard[]
): ProjectCardItem[] =>
  memberships.map((membership) => ({
    id: membership.project_id,
    name: membership.project_title,
    image: membership.project_image ?? undefined,
    tags: membership.project_role_name ? [membership.project_role_name] : [],
  }));
