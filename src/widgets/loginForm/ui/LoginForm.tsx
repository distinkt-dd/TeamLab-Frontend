import { EyeM, EyeMSlash } from '@shared/icons';
import { Button, Input } from '@shared/ui';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLoginMutation } from '@features/auth/hooks/useLoginMutation';
import TRImg from '../assets/rainbow_fuzz.png';
import BLImg from '../assets/violet_fuzz.png';
import styles from './LoginForm.module.css';

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();

  const [login, setLogin] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const loginMutation = useLoginMutation();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    loginMutation.mutate(
      { username: login, password },
      { onSuccess: () => navigate('/my-profile', { replace: true }) }
    );
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    loginMutation.reset();
    setLogin(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    loginMutation.reset();
    setPassword(e.target.value);
  };

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <Button variant="back" onClick={() => navigate(-1)}>
          Назад
        </Button>
      </div>
      <div className={styles.container}>
        <img src={TRImg} aria-hidden="true" className={styles.TRImg} />
        <img src={BLImg} aria-hidden="true" className={styles.BLImg} />
        <h2 className={styles.title}>Вход в личный кабинет</h2>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputs}>
            <Input
              labelText="Логин"
              onChange={handleLoginChange}
              value={login}
              type="text"
              name="username"
              autoComplete="username"
              required
            />
            <Input
              labelText="Пароль"
              onChange={handlePasswordChange}
              value={password}
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              required
              errorText={
                loginMutation.isError
                  ? 'Не удалось войти. Проверьте логин и пароль.'
                  : undefined
              }
              rightIcon={showPassword ? <EyeM /> : <EyeMSlash />}
              onRightIconClick={() => setShowPassword((prev) => !prev)}
            />
          </div>
          {/* TODO: Сделать страницу сброса пароля */}
          <Link to={'*'} className={styles.resetLink}>
            Забыли пароль?
          </Link>

          <div className={styles.bottom}>
            <Button
              className={styles.loginButton}
              type="submit"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Входим…' : 'Войти'}
            </Button>
            {/* TODO: Сделать страницу регистрации */}
            <span className={styles.registerText}>
              Если нет аккаунта,{' '}
              <Link to={'/reset'} className={styles.registerLink}>
                зарегистрируйтесь
              </Link>
            </span>
          </div>
        </form>
      </div>
    </section>
  );
};
