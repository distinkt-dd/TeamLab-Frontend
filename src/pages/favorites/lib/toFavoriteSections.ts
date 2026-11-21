import type { ProjectCardItem } from '@entities/project';

// В одной секции четыре проекта: две широкие карточки в левый столбец
// и две узкие в правую строку. Пятый проект начинает новую секцию.
export const FAVORITES_SECTION_SIZE = 4;

export const toFavoriteSections = (
  projects: ProjectCardItem[]
): ProjectCardItem[][] => {
  const sections: ProjectCardItem[][] = [];

  for (
    let index = 0;
    index < projects.length;
    index += FAVORITES_SECTION_SIZE
  ) {
    sections.push(projects.slice(index, index + FAVORITES_SECTION_SIZE));
  }

  return sections;
};
