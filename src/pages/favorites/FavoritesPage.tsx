import { Button } from '@shared/ui';
import { useNavigate } from 'react-router-dom';
import { toFavoriteSections } from './lib/toFavoriteSections';
import { useFavorites } from './model/useFavorites';
import { FavoriteProjectCard } from './ui/FavoriteProjectCard';
import styles from './FavoritesPage.module.css';

export const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    projects,
    isPending,
    isError,
    removeFavorite,
    removingProjectId,
    isRemoveError,
  } = useFavorites();
  const sections = toFavoriteSections(projects);

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <Button
          variant="back"
          className={styles.backButton}
          onClick={() => navigate('/my-profile')}
        >
          Личный кабинет
        </Button>
        <section className={styles.section}>
          <h2 className={styles.title}>Избранные проекты</h2>
          {isPending && <p className={styles.state}>Загружаем избранное...</p>}
          {isError && (
            <p className={styles.state} role="alert">
              Не удалось загрузить избранное. Попробуйте обновить страницу.
            </p>
          )}
          {!isPending && !isError && projects.length === 0 && (
            <>
              <p className={styles.state}>В избранном пока нет проектов.</p>
              <Button
                className={styles.emptyButton}
                variant="secondary"
                onClick={() => navigate('/projects')}
              >
                Все проекты
              </Button>
            </>
          )}
          {!isPending && !isError && projects.length > 0 && (
            <div className={styles.sections}>
              {sections.map((section) => (
                <div className={styles.sectionRow} key={section[0].id}>
                  <ul className={styles.column}>
                    {section.slice(0, 2).map((project) => (
                      <FavoriteProjectCard
                        project={project}
                        layout="wide"
                        isRemoving={removingProjectId === project.id}
                        onRemove={removeFavorite}
                        key={project.id}
                      />
                    ))}
                  </ul>
                  <ul className={styles.row}>
                    {section.slice(2, 4).map((project) => (
                      <FavoriteProjectCard
                        project={project}
                        layout="narrow"
                        isRemoving={removingProjectId === project.id}
                        onRemove={removeFavorite}
                        key={project.id}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {isRemoveError && (
            <p className={styles.error} role="alert">
              Не удалось убрать проект из избранного. Попробуйте ещё раз.
            </p>
          )}
        </section>
      </div>
    </div>
  );
};
