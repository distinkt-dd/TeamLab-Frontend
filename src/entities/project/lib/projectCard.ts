import type {
  ProjectCardItem,
  ProjectListItem,
  ProjectTagColor,
} from '../types';

// Приводит проект из API к виду, который ожидает виджет списка проектов.
export const toProjectCardItem = (
  project: ProjectListItem,
  specializationColors?: ReadonlyMap<number, ProjectTagColor>
): ProjectCardItem => ({
  id: project.id,
  name: project.title,
  image: project.image ?? undefined,
  tags: project.roles_preview.flatMap((role) =>
    role.specialization_name
      ? [
          {
            id: role.specialization_id,
            color:
              specializationColors?.get(role.specialization_id) ?? 'neutral',
            label: role.specialization_name,
          },
        ]
      : []
  ),
});

export const toProjectCardItems = (
  projects: ProjectListItem[],
  specializationColors?: ReadonlyMap<number, ProjectTagColor>
): ProjectCardItem[] =>
  projects.map((project) =>
    toProjectCardItem(project, specializationColors)
  );
