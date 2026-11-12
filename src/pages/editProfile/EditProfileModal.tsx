import { useEffect, useId } from 'react';
import { Button } from '@shared/ui';
import styles from './EditProfileModal.module.css';

// Общая оболочка модалок редактора профиля: полноэкранная панель из макета
// (белый фон с блюром), заголовок, сообщение об ошибке и кнопки
// «Отменить» / «Сохранить». Содержимое конкретной модалки передаётся детьми.
interface EditProfileModalProps {
  title: string;
  // narrow — 816px («Мои навыки»), wide — 1240px («Уровни навыков»).
  size?: 'narrow' | 'wide';
  isSaving: boolean;
  error?: string | null;
  isSaveDisabled?: boolean;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  title,
  size = 'narrow',
  isSaving,
  error,
  isSaveDisabled = false,
  onClose,
  onSave,
  children,
}) => {
  const titleId = useId();

  // Закрытие по Esc — привычное поведение модального окна.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSaving, onClose]);

  const contentClasses = [
    styles.content,
    size === 'wide' ? styles.contentWide : styles.contentNarrow,
  ].join(' ');

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className={contentClasses}>
        <h2 className={styles.title} id={titleId}>
          {title}
        </h2>

        {children}

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <div className={styles.actions}>
          <Button
            variant="primary"
            className={styles.actionButton}
            disabled={isSaving}
            onClick={onClose}
          >
            Отменить
          </Button>
          <Button
            variant="secondary"
            className={styles.actionButton}
            disabled={isSaving || isSaveDisabled}
            onClick={onSave}
          >
            {isSaving ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </div>
      </div>
    </div>
  );
};
