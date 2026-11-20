import { useAppSelector } from '@app';
import { selectAuthUser, selectIsAuthenticated } from '@features/auth';
import { Icon } from '@shared/icons';
import { Button } from '@shared/ui';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './header.module.css';

export const PersonalMenu = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectAuthUser);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        wrapperRef.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const links = [
    ...(user?.account_type === 'owner'
      ? [{ text: 'Участники', path: '/participants' }]
      : [{ text: 'Проекты', path: '/projects' }]),
    { text: 'Профиль', path: '/my-profile' },
    { text: 'Настройки', path: '/edit-profile' },
  ];

  return (
    <div
      className={styles.personalWrapper}
      ref={wrapperRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setIsOpen(false);
      }}
    >
      <Button
        variant="tertiary"
        className={styles.personalButton}
        onClick={() => {
          if (isAuthenticated) setIsOpen((open) => !open);
          else navigate('/login');
        }}
        aria-label={
          isAuthenticated ? 'Личный кабинет' : 'Войти в личный кабинет'
        }
        aria-expanded={isAuthenticated ? isOpen : undefined}
        aria-controls={isAuthenticated && isOpen ? menuId : undefined}
      >
        Личный кабинет
      </Button>
      {isOpen && isAuthenticated && (
        <div className={styles.dropdown} id={menuId}>
          <div className={styles.actionIcons}>
            <button
              type="button"
              aria-label="Меню"
              className={styles.iconWrapper}
              onClick={() => setIsOpen(false)}
            >
              <Icon name="burgerM" size={44} />
            </button>
            <div className={styles.notificationsWrapper}>
              <button
                type="button"
                aria-label="Уведомления"
                className={styles.iconWrapper}
                onClick={() => setIsOpen(false)}
              >
                <Icon name="notifications" size={44} />
              </button>
              <span className={styles.counter}>0</span>
            </div>
            <Link
              to="/favorites"
              aria-label="Избранное"
              className={styles.iconWrapper}
              onClick={() => setIsOpen(false)}
            >
              <Icon name="like" size={44} />
            </Link>
          </div>
          <nav aria-label="Личный кабинет">
            <ul className={styles.personalList}>
              {links.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={styles.link}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.text}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
};
