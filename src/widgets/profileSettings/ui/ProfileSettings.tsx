import { useState } from 'react';
import type { ProfileVisibility } from '@entities/user/types';
import { Icon } from '@shared/icons';
import { Button, Tag } from '@shared/ui';
import { Link } from 'react-router-dom';
import styles from './ProfileSettings.module.css';
import { PasswordChangeModal } from './PasswordChangeModal';
import { VisibilitySelect } from './VisibilitySelect';

// Пункт блока «В ожидании ответа»: заголовок и, при наличии, тег (специализация роли).
export interface ProfileWaitingItem {
  id: number;
  title: string;
  tag?: string | null;
  href?: string;
}

export interface ProfileSettingsProps {
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
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  return (
    <>
      <section className={styles.options}>
        <div className={styles.optionBlock}>
          <h3>Настройки</h3>
          <div className={styles.optionOptions}>
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
            <div className={styles.optionRow}>
              <span>Пароль</span>
              <div className={styles.passwordControl}>
                <span className={styles.passwordMask} aria-hidden="true">
                  ••••••••
                </span>
                <button
                  type="button"
                  className={styles.passwordEdit}
                  onClick={() => setIsPasswordModalOpen(true)}
                  aria-label="Изменить пароль"
                >
                  <Icon name="editS" size={24} aria-hidden="true" />
                </button>
              </div>
            </div>
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
            {!isWaitingPending &&
              !isWaitingError &&
              waitingItems.length > 0 && (
                <ul className={styles.waitingList}>
                  {waitingItems.map((item) => (
                    <li className={styles.waitingItem} key={item.id}>
                      {item.href ? (
                        <Link className={styles.waitingTitle} to={item.href}>
                          {item.title}
                        </Link>
                      ) : (
                        <span className={styles.waitingTitle}>
                          {item.title}
                        </span>
                      )}
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
      {isPasswordModalOpen && (
        <PasswordChangeModal onClose={() => setIsPasswordModalOpen(false)} />
      )}
    </>
  );
};
