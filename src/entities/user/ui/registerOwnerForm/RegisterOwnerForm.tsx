import { Button, Input } from '@shared/ui';
import styles from './RegisterOwnerForm.module.css';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EyeM, EyeMSlash } from '@shared/icons';
import { Select } from '@shared/ui/select';
import { REGISTRATION_DIRECTIONS } from '../../lib/registration';
import type { RegisterFormData } from '../../lib/registration';

interface RegisterOwnerFormProps {
  role: string;
  onSubmit: (data: RegisterFormData) => void;
  isPending?: boolean;
  errorText?: string;
  onResetError?: () => void;
}

export const RegisterOwnerForm: React.FC<RegisterOwnerFormProps> = ({
  role: _role,
  onSubmit,
  isPending = false,
  errorText,
  onResetError,
}) => {
  void _role;
  const [email, setEmail] = useState<string>('');
  const [login, setLogin] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [specialization, setSpecialization] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Изменение полей сбрасывает ошибки прошлого запроса и локальной проверки.
  const resetErrors = () => {
    setFormError(null);
    onResetError?.();
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetErrors();
    setEmail(e.target.value);
  };

  const handleloginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetErrors();
    setLogin(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetErrors();
    setPassword(e.target.value);
  };

  const handleSpecializationChange = (value: string) => {
    resetErrors();
    setSpecialization(value);
  };

  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!specialization) {
      setFormError('Выберите специализацию из списка.');
      return;
    }

    setFormError(null);
    onSubmit({
      email,
      username: login,
      password,
      direction: specialization,
    });
  };

  const visibleError = formError ?? errorText;

  return (
    <div className={styles.form}>
      <div className={styles.wrapper}>
        <Input
          labelText="Электронная почта"
          placeholder="example@domain.ru"
          type="email"
          onChange={handleEmailChange}
          value={email}
          required
        />
        <Input
          labelText="Логин"
          placeholder=""
          type="text"
          onChange={handleloginChange}
          value={login}
          required
          minLength={3}
          maxLength={15}
        />
        <Input
          labelText="Пароль"
          placeholder=""
          type={showPassword ? 'text' : 'password'}
          onChange={handlePasswordChange}
          value={password}
          required
          minLength={8}
          maxLength={20}
          rightIcon={showPassword ? <EyeM /> : <EyeMSlash />}
          onRightIconClick={() => setShowPassword((prev) => !prev)}
        />
        <Select
          labelText="Специализация"
          value={specialization}
          onChange={handleSpecializationChange}
          fullWidth
          options={REGISTRATION_DIRECTIONS}
        />
        <p className={styles.policyText}>
          Нажимая «Зарегистрироваться», я даю согласие на обработку моих
          персональных данных <br /> и принимаю условия{' '}
          <Link to={'/policy'} className={styles.link}>
            Пользовательского соглашения
          </Link>{' '}
          и{' '}
          <Link to={'/policy'} className={styles.link}>
            Политики конфиденциальности
          </Link>
        </p>
        {visibleError && <p className={styles.errorText}>{visibleError}</p>}
      </div>
      <Button
        type="submit"
        className={styles.button}
        onClick={handleSubmit}
        disabled={isPending}
      >
        {isPending ? 'Отправляем данные…' : 'Зарегистрироваться'}
      </Button>
    </div>
  );
};
