import { Button } from '@shared/ui';
import { useNavigate } from 'react-router-dom';
import styles from './FavoritesPage.module.css';

export const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/my-profile');
  };
  return (
    <div className={styles.container}>
      <section className={styles.section}>
        <Button
          className={styles.buttonBack}
          type="button"
          variant="back"
          onClick={() => handleBack()}
        >
          Личный кабинет
        </Button>
        <h2 className={styles.title}>Избранные проекты</h2>
      </section>
    </div>
  );
};
