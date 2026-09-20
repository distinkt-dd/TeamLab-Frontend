import type { CurrentUser, UserLevel, WorkFormat } from '@entities/user/types';
import { Button, Tag } from '@shared/ui';
import styles from './ParticipantProfile.module.css';

// Подписи для тегов профиля — те же тексты, что и в choices на backend.
const levelLabels: Record<UserLevel, string> = {
  junior: 'Базовый',
  middle: 'Средний',
  senior: 'Продвинутый',
};

const workFormatLabels: Record<WorkFormat, string> = {
  remote: 'Удалённо',
  hybrid: 'Гибрид',
};

interface ParticipantProfileProps {
  user?: CurrentUser;
  isPending: boolean;
  isError: boolean;
}

// Каркас секции: заголовок и обёртка контента одинаковы для всех состояний запроса.
const ParticipantProfileSection: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  return (
    <section className={styles.profileSection}>
      <h3>Профиль</h3>
      <div className={styles.content}>{children}</div>
    </section>
  );
};

export const ParticipantProfile: React.FC<ParticipantProfileProps> = ({
  user,
  isPending,
  isError,
}) => {
  if (isPending) {
    return (
      <ParticipantProfileSection>
        <span>Загружаем профиль...</span>
      </ParticipantProfileSection>
    );
  }

  if (isError) {
    return (
      <ParticipantProfileSection>
        <span role="alert">
          Не удалось загрузить профиль. Попробуйте обновить страницу.
        </span>
      </ParticipantProfileSection>
    );
  }

  if (!user) {
    return <ParticipantProfileSection />;
  }

  return (
    <ParticipantProfileSection>
      <div className={styles.profile}>
        <div className={styles.profileInfo}>
          <div className={styles.row}>
            <span className={styles.label}>Специализация:</span>
            <span className={styles.value}>{user.specialization_name}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Имя:</span>
            <span className={styles.value}>{user.username}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Статус:</span>
            <span className={styles.value}>{user.search_status}</span>
          </div>
        </div>
        <div className={styles.tags}>
          <Tag>{user.city ?? 'Не указано'}</Tag>
          <Tag>{user.specialization_name ?? 'Не указано'}</Tag>
          <Tag>
            {user.work_format
              ? workFormatLabels[user.work_format]
              : 'Не указано'}
          </Tag>
          <Tag>{user.level ? levelLabels[user.level] : 'Не указано'}</Tag>
        </div>
        <div className={styles.buttonsSection}>
          <Button className={styles.iconButton} iconName="trashM"></Button>
          <Button className={styles.iconButton} iconName="editM"></Button>
        </div>
      </div>
    </ParticipantProfileSection>
  );
};
