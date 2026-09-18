import { useState } from 'react';
import type { ProjectCardItem } from '@entities/project/types';
import { Button } from '@shared/ui';
import { ProjectsList } from '@widgets/projectsList';
import styles from './CurrentProjects.module.css';

const PAGE_SIZE = 3;

interface CurrentProjectsProps {
  projects: ProjectCardItem[];
  isPending: boolean;
  isError: boolean;
}

// Каркас секции: заголовок и обёртка контента одинаковы для всех состояний запроса.
const CurrentProjectsSection: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  return (
    <section>
      <h3>Текущие проекты</h3>
      <div className={styles.content}>{children}</div>
    </section>
  );
};

export const CurrentProjects: React.FC<CurrentProjectsProps> = ({
  projects,
  isPending,
  isError,
}) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visibleProjects = projects.slice(0, visibleCount);
  const hasMore = visibleCount < projects.length;

  const handleShowMore = () => {
    setVisibleCount((count) => Math.min(count + PAGE_SIZE, projects.length));
  };

  if (isPending) {
    return (
      <CurrentProjectsSection>
        <p>Загружаем проекты...</p>
      </CurrentProjectsSection>
    );
  }

  if (isError) {
    return (
      <CurrentProjectsSection>
        <p role="alert">
          Не удалось загрузить проекты. Попробуйте обновить страницу.
        </p>
      </CurrentProjectsSection>
    );
  }

  if (projects.length === 0) {
    return (
      <CurrentProjectsSection>
        <p>Проектов пока нет.</p>
      </CurrentProjectsSection>
    );
  }

  return (
    <CurrentProjectsSection>
      <ProjectsList data={visibleProjects} />
      {hasMore && <Button onClick={handleShowMore}>Показать еще</Button>}
    </CurrentProjectsSection>
  );
};
