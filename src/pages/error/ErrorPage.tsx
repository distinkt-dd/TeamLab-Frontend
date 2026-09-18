import { Button } from '@shared/ui';
import { useNavigate } from 'react-router-dom';
import styles from './ErrorPage.module.css';

export const ErrorPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.title}>
            <span className={styles.titlePrimary}>Страница потерялась.</span>
            <span className={styles.titleSecondary}>
              Это бывает. Проекты перемещаются, идеи меняют адреса
            </span>
          </h1>

          <div className={styles.details}>
            <p className={styles.description}>
              У нас всё живое, а не конвейер.
              <br />
              Иногда это значит, что ссылка
              <br />
              живёт своей жизнью
            </p>

            <Button
              variant="secondary"
              className={styles.projectsButton}
              onClick={() => navigate('/projects')}
            >
              Все проекты
            </Button>

            <p className={styles.hint}>
              Кстати, простой refresh
              <br />
              решает ≈ 30% таких
              <br />
              историй. Просто F5
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
