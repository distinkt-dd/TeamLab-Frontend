import { Button } from '@shared/ui';
import styles from './ProfileHeader.module.css';

interface ProfileHeaderProps {
  onBack: () => void;
  onFavorites: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  onBack,
  onFavorites,
}) => {
  return (
    <>
      <Button variant="back" className={styles.backButton} onClick={onBack}>
        На главную
      </Button>
      <section className={styles.section}>
        <h2 className={styles.title}>Личный кабинет</h2>
        <div className={styles.navItems}>
          <Button className={styles.navButton} iconName="notifications">
            Уведомления
          </Button>
          <Button
            className={styles.navButton}
            iconName="like"
            onClick={onFavorites}
          >
            Избранное
          </Button>
        </div>
      </section>
    </>
  );
};
