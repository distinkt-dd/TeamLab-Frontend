import type { ProjectCardItem, ProjectListItem } from '../types';

// Приводит проект из API к виду, который ожидает виджет списка проектов.
export const toProjectCardItem = (
  project: ProjectListItem
): ProjectCardItem => ({
  id: project.id,
  name: project.title,
  image: project.image ?? undefined,
  tags: project.roles_preview
    .map((role) => role.specialization_name)
    .filter((name): name is string => Boolean(name)),
});

export const toProjectCardItems = (
  projects: ProjectListItem[]
): ProjectCardItem[] => projects.map(toProjectCardItem);
