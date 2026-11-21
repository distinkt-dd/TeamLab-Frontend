import { getServices, useAppSelector } from '@app';
import {
  UserService,
  currentUserInvitationsQueryKey,
} from '@entities/user';
import { selectAuthUser, selectIsAuthenticated } from '@features/auth';
import { Icon } from '@shared/icons';
import { Button } from '@shared/ui';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './header.module.css';

export const PersonalMenu = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectAuthUser);
  const [isOpen, setIsOpen] = useState(false);
  const [areNotificationsOpen, setAreNotificationsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const notificationsId = useId();
  const navigate = useNavigate();
  const { api } = getServices();
  const userService = useMemo(() => new UserService(api), [api]);
  const isParticipant = user?.account_type === 'participant';

  const {
    data: notifications,
    isPending: areNotificationsPending,
    isError: areNotificationsError,
  } = useQuery({
    queryKey: currentUserInvitationsQueryKey(user?.id ?? 0),
    queryFn: () => userService.getAllNotifications(),
    enabled: isAuthenticated && isParticipant && Boolean(user?.id),
  });

  const invitations = useMemo(
    () =>
      (notifications ?? []).filter(
        ({ source, status }) =>
          source === 'invitation' && status === 'pending'
      ),
    [notifications]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setAreNotificationsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setAreNotificationsOpen(false);
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
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
          setAreNotificationsOpen(false);
        }
      }}
    >
      <Button
        variant="tertiary"
        className={styles.personalButton}
        onClick={() => {
          if (isAuthenticated) {
            setIsOpen((open) => !open);
            setAreNotificationsOpen(false);
          } else navigate('/login');
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
              onClick={() => {
                setIsOpen(false);
                setAreNotificationsOpen(false);
              }}
            >
              <Icon name="burgerM" size={44} />
            </button>
            <div className={styles.notificationsWrapper}>
              <button
                type="button"
                aria-label={
                  isParticipant
                    ? `Ожидающих приглашений: ${invitations.length}`
                    : 'Уведомления'
                }
                aria-expanded={
                  isParticipant ? areNotificationsOpen : undefined
                }
                aria-controls={
                  isParticipant && areNotificationsOpen
                    ? notificationsId
                    : undefined
                }
                className={`${styles.iconWrapper} ${
                  areNotificationsOpen ? styles.iconWrapperActive : ''
                }`}
                onClick={() => {
                  if (isParticipant) {
                    setAreNotificationsOpen((open) => !open);
                  } else {
                    setIsOpen(false);
                  }
                }}
              >
                <Icon name="notifications" size={44} />
              </button>
              {isParticipant ? (
                invitations.length > 0 && (
                  <span className={styles.counter}>{invitations.length}</span>
                )
              ) : (
                <span className={styles.counter}>0</span>
              )}
            </div>
            <Link
              to="/favorites"
              aria-label="Избранное"
              className={styles.iconWrapper}
              onClick={() => {
                setIsOpen(false);
                setAreNotificationsOpen(false);
              }}
            >
              <Icon name="like" size={44} />
            </Link>
          </div>
          {isParticipant && areNotificationsOpen ? (
            <section
              className={styles.notificationsPanel}
              id={notificationsId}
              aria-label="Входящие приглашения"
            >
              {areNotificationsPending ? (
                <p className={styles.notificationState} role="status">
                  Загружаем приглашения…
                </p>
              ) : areNotificationsError ? (
                <p className={styles.notificationState} role="alert">
                  Не удалось загрузить приглашения.
                </p>
              ) : invitations.length === 0 ? (
                <p className={styles.notificationState}>
                  Приглашений пока нет.
                </p>
              ) : (
                <ul className={styles.notificationList}>
                  {invitations.map((invitation) => (
                    <li key={invitation.id}>
                      {Number.isInteger(invitation.project_id) &&
                      invitation.project_id > 0 ? (
                        <Link
                          to={`/projects/${invitation.project_id}`}
                          className={styles.notificationLink}
                          title={invitation.project_title}
                          onClick={() => {
                            setIsOpen(false);
                            setAreNotificationsOpen(false);
                          }}
                        >
                          {invitation.project_title}
                        </Link>
                      ) : (
                        <span className={styles.notificationText}>
                          {invitation.project_title}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
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
          )}
        </div>
      )}
    </div>
  );
};
