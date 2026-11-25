import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServices } from '@app';
import { Button } from '@shared/ui/button';
import { ProfileSettings } from '@widgets/profileSettings';
import { ProjectsList } from '@widgets/projectsList';
import { useMyProfileOwner } from './model/useMyProfileOwner';
import styles from './MyProfileOwnerPage.module.css';

const PAGE_SIZE = 3;

export const MyProfileOwnerPage: React.FC = () => {
  const navigate = useNavigate();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const {
    user,
    projectCards,
    isProjectsPending,
    isProjectsError,
    waitingItems,
    pendingRequestsCount,
    isWaitingPending,
    isWaitingError,
  } = useMyProfileOwner();

  const visibleProjects = projectCards.slice(0, visibleCount);
  const hasMore = visibleCount < projectCards.length;

  const handleShowMore = () => {
    setVisibleCount((count) =>
      Math.min(count + PAGE_SIZE, projectCards.length)
    );
  };

  const handleLogout = () => {
    void getServices().auth.logout();
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
            <div className={styles.requestsEntry}>
              <Button
                className={styles.navButton}
                iconName="notifications"
                onClick={() => navigate('/requests')}
                aria-label={
                  pendingRequestsCount > 0
                    ? `Заявки, новых: ${pendingRequestsCount}`
                    : 'Заявки'
                }
              >
                Заявки
              </Button>
              {pendingRequestsCount > 0 && (
                <span className={styles.requestsBadge} aria-hidden="true">
                  {pendingRequestsCount}
                </span>
              )}
            </div>
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
                <>
                  <p className={styles.state}>Проектов пока нет.</p>
                  <Button
                    className={styles.createProject}
                    variant="secondary"
                    onClick={() => navigate('/edit-project')}
                  >
                    Создать проект
                  </Button>
                </>
              )}
            {!isProjectsPending &&
              !isProjectsError &&
              projectCards.length > 0 && (
                <ProjectsList
                  data={visibleProjects}
                  className={styles.projectsList}
                  showProjectActions
                />
              )}
            {!isProjectsPending && !isProjectsError && hasMore && (
              <Button className={styles.button} onClick={handleShowMore}>
                Показать еще
              </Button>
            )}
          </div>
        </section>
        <ProfileSettings
          onLogout={handleLogout}
          profileEmail={user?.email}
          waitingItems={waitingItems}
          isWaitingPending={isWaitingPending}
          isWaitingError={isWaitingError}
          waitingPendingText="Загружаем приглашения..."
          waitingErrorText="Не удалось загрузить приглашения. Попробуйте обновить страницу."
          waitingEmptyText="Приглашений пока нет."
        />
      </div>
    </div>
  );
};
