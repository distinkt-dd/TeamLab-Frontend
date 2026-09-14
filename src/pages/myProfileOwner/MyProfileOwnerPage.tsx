import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getServices } from '@app';
import { UserService } from '@entities/user';
import { Button } from '@shared/ui/button';
import styles from './MyProfileOwnerPage.module.css';

export const MyProfileOwnerPage: React.FC = () => {
  const navigate = useNavigate();
  const { api } = getServices();
  const userService = useMemo(() => new UserService(api), [api]);

  // Данные текущего пользователя с типом owner (GET /users/me/)
  const {
    data: user,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => userService.getCurrent(),
  });
  console.log(user);
  const handleLogout = () => {
    getServices().auth.logout();
  };

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <Button
          variant="back"
          className={styles.backButton}
          onClick={() => navigate('/')}
        >
          На главную
        </Button>
        <section className={styles.section}>
          <h2 className={styles.title}>Личный кабинет</h2>
          <div className={styles.navItems}>
            <Button className={styles.navButton} iconName="notifications">
              Уведомления
            </Button>
            <Button className={styles.navButton} iconName="like">
              Избранное
            </Button>
          </div>
        </section>
        <section>
          <h3>Текущие проекты</h3>
          <div className={styles.projectsBlock}>
            <span>Тут блок для текущих проектов</span>
          </div>
        </section>
        <section>
          <h3>Профиль</h3>
          <div className={styles.projectsBlock}>
            {isPending && <span>Загружаем профиль...</span>}
            {isError && (
              <span role="alert">
                Не удалось загрузить профиль. Попробуйте обновить страницу.
              </span>
            )}
            {!isPending && !isError && user && (
              <div className={styles.profileInfo}>
                <span>Имя: {user.display_name}</span>
                <span>Логин: {user.username}</span>
                <span>Email: {user.email}</span>
              </div>
            )}
          </div>
        </section>
        <section>
          <Button variant="tertiary" onClick={handleLogout}>
            Выйти
          </Button>
        </section>
      </div>
    </div>
  );
};
