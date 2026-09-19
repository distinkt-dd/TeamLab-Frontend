import type { ProfileVisibility } from '@entities/user/types';
import { Button, Tag } from '@shared/ui';
import styles from './ProfileSettings.module.css';
import { NotificationSelect } from './NotificationSelect';
import { VisibilitySelect } from './VisibilitySelect';

// Пункт блока «В ожидании ответа»: заголовок и, при наличии, тег (специализация роли).
export interface ProfileWaitingItem {
  id: number;
  title: string;
  tag?: string | null;
}

export interface ProfileSettingsProps {
  notificationEnabled?: boolean;
  isNotificationUpdating?: boolean;
  isNotificationUpdateError?: boolean;
  onNotificationChange?: (enabled: boolean) => void;
  // Видимость профиля настраивает только участник, поэтому строки нет,
  // если обработчик не передан.
  profileVisibility?: ProfileVisibility;
  isVisibilityUpdating?: boolean;
  isVisibilityUpdateError?: boolean;
  onVisibilityChange?: (visibility: ProfileVisibility) => void;
  profileEmail?: string;
  onLogout: () => void;
  waitingItems?: ProfileWaitingItem[];
  isWaitingPending?: boolean;
  isWaitingError?: boolean;
  waitingPendingText: string;
  waitingErrorText: string;
  waitingEmptyText: string;
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
  profileEmail,
  onLogout,
  waitingItems = [],
  isWaitingPending = false,
  isWaitingError = false,
  waitingPendingText,
  waitingErrorText,
  waitingEmptyText,
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
          {onVisibilityChange && (
            <>
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
            </>
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
        <div className={styles.waitingContent}>
          {isWaitingPending && <p>{waitingPendingText}</p>}
          {isWaitingError && <p role="alert">{waitingErrorText}</p>}
          {!isWaitingPending &&
            !isWaitingError &&
            waitingItems.length === 0 && <p>{waitingEmptyText}</p>}
          {!isWaitingPending && !isWaitingError && waitingItems.length > 0 && (
            <ul className={styles.waitingList}>
              {waitingItems.map((item) => (
                <li className={styles.waitingItem} key={item.id}>
                  <span className={styles.waitingTitle}>{item.title}</span>
                  {item.tag && (
                    <Tag className={styles.waitingTag}>{item.tag}</Tag>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};
