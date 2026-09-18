import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getServices } from '@app';
import { UserService } from '@entities/user';
import { Button } from '@shared/ui/button';
import styles from './MyProfileOwnerPage.module.css';
import { ProjectsList } from '@widgets/projectsList';
import { ProjectService } from '@entities/project';

const PAGE_SIZE = 3;

export const MyProfileOwnerPage: React.FC = () => {
  const navigate = useNavigate();
  const { api } = getServices();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const userService = useMemo(() => new UserService(api), [api]);
  const projectService = useMemo(() => new ProjectService(api), [api]);

  // Данные текущего пользователя с типом owner (GET /users/me/)
  const {
    data: user,
    isPending: isUserPending,
    isError: isUserError,
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => userService.getCurrent(),
  });
  const {
    data: projects,
    isPending: isProjectsPending,
    isError: isProjectsError,
  } = useQuery({
    // ключ включает отсортированный список ID — это важно для корректного кэша
    queryKey: [
      'userProjects',
      [...(user?.owned_project_ids ?? [])].sort((a, b) => a - b),
    ],
    queryFn: async () => {
      const ids = user?.owned_project_ids ?? [];
      if (ids.length === 0) return [];

      // Параллельная загрузка всех проектов по ID
      const promises = ids.map((id) => projectService.getProjectDetail(id));
      return Promise.all(promises);
    },
    enabled: !!user && Array.isArray(user.owned_project_ids), // не запускаем, пока нет user
  });

  const projectCards = useMemo(
    () =>
      (projects ?? []).map((project) => ({
        id: project.id,
        name: project.title,
        image: project.image ?? undefined,
        tags: project.roles
          .map((role) => role.specialization_name)
          .filter((name): name is string => Boolean(name)),
      })),
    [projects]
  );
  const visibleProjects = projectCards.slice(0, visibleCount);
  const hasMore = visibleCount < projectCards.length;

  const handleShowMore = () => {
    setVisibleCount((count) =>
      Math.min(count + PAGE_SIZE, projectCards.length)
    );
  };

  const handleLogout = () => {
    getServices().auth.logout();
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
          <h2 className={styles.title}>Личный кабинет</h2>
          <div className={styles.navItems}>
            <Button className={styles.navButton} iconName="notifications">
              Уведомления
            </Button>
            <Button className={styles.navButton} iconName="like">
              Избранное
            </Button>
          </div>
        </section>
        <section>
          <h3>Текущие проекты</h3>
          <div className={styles.projectsBlock}>
            {isProjectsPending && (
              <p className={styles.state}>Загружаем проекты...</p>
            )}
            {isProjectsError && (
              <p className={styles.state} role="alert">
                Не удалось загрузить проекты. Попробуйте обновить страницу.
              </p>
            )}
            {!isProjectsPending &&
              !isProjectsError &&
              projectCards.length === 0 && (
                <p className={styles.state}>Проектов пока нет.</p>
              )}
            {!isProjectsPending &&
              !isProjectsError &&
              projectCards.length > 0 && (
                <ProjectsList
                  data={visibleProjects}
                  className={styles.projectsList}
                />
              )}
            {!isProjectsPending && !isProjectsError && hasMore && (
              <Button className={styles.button} onClick={handleShowMore}>
                Показать еще
              </Button>
            )}
          </div>
        </section>
        <section>
          <h3>Профиль</h3>
          <div className={styles.projectsBlock}>
            {isUserPending && <span>Загружаем профиль...</span>}
            {isUserError && (
              <span role="alert">
                Не удалось загрузить профиль. Попробуйте обновить страницу.
              </span>
            )}
            {!isUserPending && !isUserError && user && (
              <div className={styles.profileInfo}>
                <span>Имя: {user.display_name}</span>
                <span>Логин: {user.username}</span>
                <span>Email: {user.email}</span>
              </div>
            )}
          </div>
        </section>
        <section>
          <Button variant="tertiary" onClick={handleLogout}>
            Выйти
          </Button>
        </section>
      </div>
    </div>
  );
};
