import type { ProfileVisibility } from '@entities/user/types';
import { Button } from '@shared/ui';
import styles from './ProfileSettings.module.css';
import { NotificationSelect } from './NotificationSelect';
import { VisibilitySelect } from './VisibilitySelect';

interface ProfileSettingsProps {
  notificationEnabled?: boolean;
  isNotificationUpdating?: boolean;
  isNotificationUpdateError?: boolean;
  onNotificationChange?: (enabled: boolean) => void;
  profileVisibility?: ProfileVisibility;
  isVisibilityUpdating?: boolean;
  isVisibilityUpdateError?: boolean;
  onVisibilityChange?: (visibility: ProfileVisibility) => void;
  onLogout: () => void;
  profileEmail?: string;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  notificationEnabled,
  isNotificationUpdating = false,
  isNotificationUpdateError = false,
  onNotificationChange,
  profileVisibility,
  isVisibilityUpdating = false,
  isVisibilityUpdateError = false,
  onVisibilityChange,
  onLogout,
  profileEmail,
}) => {
  return (
    <section className={styles.options}>
      <div className={styles.optionBlock}>
        <h3>Настройки</h3>
        <div className={styles.optionOptions}>
          <div className={styles.optionRow}>
            <span>Уведомления</span>
            <NotificationSelect
              notificationEnabled={notificationEnabled}
              disabled={isNotificationUpdating}
              onChange={onNotificationChange}
              className={styles.notificationSelect}
            />
          </div>
          {isNotificationUpdateError && (
            <span className={styles.optionError} role="alert">
              Не удалось сохранить настройки уведомлений. Попробуйте ещё раз.
            </span>
          )}
          <div className={styles.optionRow}>
            <span>Видимость профиля</span>
            <VisibilitySelect
              profileVisibility={profileVisibility}
              disabled={isVisibilityUpdating}
              onChange={onVisibilityChange}
              className={styles.visibilitySelect}
            />
          </div>
          {isVisibilityUpdateError && (
            <span className={styles.optionError} role="alert">
              Не удалось сохранить видимость профиля. Попробуйте ещё раз.
            </span>
          )}
          <span>Пароль</span>
          <div className={styles.optionRow}>
            <span>Электронная почта</span>
            {profileEmail || <span>Не указан</span>}
          </div>
        </div>
        <div className={styles.buttonBlock}>
          <Button variant="tertiary" onClick={onLogout}>
            Выйти
          </Button>
        </div>
      </div>
      <div className={styles.waitingBlock}>
        <h3>В ожидании ответа</h3>
      </div>
    </section>
  );
};
