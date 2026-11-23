import { useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { getServices } from '@app';
import { UserService } from '@entities/user';
import { Icon } from '@shared/icons';
import { Button, Input } from '@shared/ui';
import styles from './PasswordChangeModal.module.css';

interface PasswordChangeModalProps {
  onClose: () => void;
}

const getPasswordError = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return 'Не удалось изменить пароль. Попробуйте ещё раз.';
  }

  return error.message.replace(/^Request failed with status \d+:\s*/, '');
};

export const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({
  onClose,
}) => {
  const { api } = getServices();
  const titleId = useId();
  const userService = useMemo(() => new UserService(api), [api]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordsMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const isSaveDisabled =
    isSaving ||
    isSuccess ||
    !currentPassword ||
    !newPassword ||
    !confirmPassword ||
    passwordsMismatch;

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isSaving, onClose]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaveDisabled) return;

    setError(null);
    setIsSaving(true);
    try {
      await userService.setPassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsSuccess(true);
    } catch (requestError: unknown) {
      setError(getPasswordError(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const visibilityIcon = (visible: boolean, label: string) => (
    <Icon name={visible ? 'eyeM' : 'eyeMSlash'} size={28} aria-label={label} />
  );

  return createPortal(
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <form className={styles.modal} onSubmit={handleSubmit}>
        <div className={styles.header}>
          <h2 className={styles.title} id={titleId}>
            Изменить пароль
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            disabled={isSaving}
            onClick={onClose}
            aria-label="Закрыть форму изменения пароля"
          >
            <Icon name="close" size={24} aria-hidden="true" />
          </button>
        </div>

        {isSuccess ? (
          <p className={styles.success} role="status">
            Пароль успешно изменён. Текущая сессия сохранена.
          </p>
        ) : (
          <div className={styles.fields}>
            <Input
              labelText="Текущий пароль"
              name="current-password"
              type={showCurrentPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={currentPassword}
              disabled={isSaving}
              required
              onChange={(event) => {
                setCurrentPassword(event.target.value);
                setError(null);
              }}
              rightIcon={visibilityIcon(
                showCurrentPassword,
                showCurrentPassword
                  ? 'Скрыть текущий пароль'
                  : 'Показать текущий пароль'
              )}
              onRightIconClick={() =>
                setShowCurrentPassword((visible) => !visible)
              }
            />
            <Input
              labelText="Новый пароль"
              name="new-password"
              type={showNewPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={newPassword}
              disabled={isSaving}
              required
              minLength={8}
              onChange={(event) => {
                setNewPassword(event.target.value);
                setError(null);
              }}
              rightIcon={visibilityIcon(
                showNewPassword,
                showNewPassword
                  ? 'Скрыть новый пароль'
                  : 'Показать новый пароль'
              )}
              onRightIconClick={() => setShowNewPassword((visible) => !visible)}
            />
            <Input
              labelText="Повторите новый пароль"
              name="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              disabled={isSaving}
              required
              minLength={8}
              errorText={
                passwordsMismatch ? 'Новые пароли не совпадают' : undefined
              }
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setError(null);
              }}
              rightIcon={visibilityIcon(
                showConfirmPassword,
                showConfirmPassword
                  ? 'Скрыть подтверждение пароля'
                  : 'Показать подтверждение пароля'
              )}
              onRightIconClick={() =>
                setShowConfirmPassword((visible) => !visible)
              }
            />
          </div>
        )}

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
            {isSuccess ? 'Закрыть' : 'Отменить'}
          </Button>
          {!isSuccess && (
            <Button
              type="submit"
              variant="secondary"
              className={styles.actionButton}
              disabled={isSaveDisabled}
            >
              {isSaving ? 'Изменяем…' : 'Изменить пароль'}
            </Button>
          )}
        </div>
      </form>
    </div>,
    document.body
  );
};
