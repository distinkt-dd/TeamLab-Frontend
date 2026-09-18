import type { ProjectCardItem, ProjectDetail } from '@entities/project/types';

// Приводит проекты из API к виду, который ожидает виджет списка проектов.
export const toProjectCards = (projects: ProjectDetail[]): ProjectCardItem[] =>
  projects.map((project) => ({
    id: project.id,
    name: project.title,
    image: project.image ?? undefined,
    tags: project.roles
      .map((role) => role.specialization_name)
      .filter((name): name is string => Boolean(name)),
  }));
