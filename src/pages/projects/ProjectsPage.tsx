import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getServices } from '@app';
import { ProjectService, toProjectCardItems } from '@entities/project';
import { Filter } from '@features/filter';
import { Button } from '@shared/ui/button';
import { ProjectsList } from '@widgets/projectsList';
import styles from './ProjectsPage.module.css';

const PAGE_SIZE = 3;

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { api } = getServices();
  const projectService = useMemo(() => new ProjectService(api), [api]);

  const { data, isPending, isError } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectService.list(),
  });

  const projects = useMemo(() => toProjectCardItems(data ?? []), [data]);
  const visibleProjects = projects.slice(0, visibleCount);
  const hasMore = visibleCount < projects.length;

  const handleShowMore = () => {
    setVisibleCount((count) => Math.min(count + PAGE_SIZE, projects.length));
  };

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <Button
          variant="back"
          className={styles.backButton}
          onClick={() => navigate('/')}
        >
          На главную
        </Button>
        <section className={styles.section}>
          <h2 className={styles.title}>Все проекты </h2>
          <Filter className={styles.filter} />
          {isPending && <p className={styles.state}>Загружаем проекты...</p>}
          {isError && (
            <p className={styles.state} role="alert">
              Не удалось загрузить проекты. Попробуйте обновить страницу.
            </p>
          )}
          {!isPending && !isError && projects.length === 0 && (
            <p className={styles.state}>Проектов пока нет.</p>
          )}
          {!isPending && !isError && projects.length > 0 && (
            <ProjectsList
              data={visibleProjects}
              className={styles.projectsList}
            />
          )}
          {!isPending && !isError && hasMore && (
            <Button className={styles.button} onClick={handleShowMore}>
              Показать еще
            </Button>
          )}
        </section>
      </div>
    </div>
  );
};
