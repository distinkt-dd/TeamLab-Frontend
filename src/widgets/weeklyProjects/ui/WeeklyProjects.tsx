import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getServices } from '@app';
import { ProjectService, toProjectCardItems } from '@entities/project';
import { ProjectsList } from '@widgets/projectsList';
import styles from './WeeklyProjects.module.css';
import { Button } from '@shared/ui';
import { useNavigate } from 'react-router-dom';

export const WeeklyProjects: React.FC = () => {
  const navigate = useNavigate();
  const { api } = getServices();
  const projectService = useMemo(() => new ProjectService(api), [api]);
  const { data, isPending, isError } = useQuery({
    queryKey: ['projects', 'featured'],
    queryFn: () => projectService.getFeaturedProjects(),
  });
  const projects = useMemo(
    () => toProjectCardItems(data?.results ?? []),
    [data]
  );

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.title}>проекты недели</h2>
        {isPending && <p className={styles.state}>Загружаем проекты...</p>}
        {isError && (
          <p className={styles.state} role="alert">
            Не удалось загрузить проекты. Попробуйте обновить страницу.
          </p>
        )}
        {!isPending && !isError && projects.length === 0 && (
          <p className={styles.state}>Закреплённых проектов пока нет.</p>
        )}
        {!isPending && !isError && projects.length > 0 && (
          <ProjectsList data={projects} />
        )}
        <Button className={styles.button} onClick={() => navigate('/projects')}>
          Смотреть все проекты
        </Button>
      </div>
    </section>
  );
};
