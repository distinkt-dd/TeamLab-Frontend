import { getServices, useAppSelector } from '@app';
import {
  UserService,
  currentUserInvitationsQueryKey,
  currentUserNotificationsQueryKey,
} from '@entities/user';
import { selectAuthUser, selectIsAuthenticated } from '@features/auth';
import { Icon } from '@shared/icons';
import { Button } from '@shared/ui';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './header.module.css';

type PersonalMenuTab = 'navigation' | 'notifications' | 'favorites';

export const PersonalMenu = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectAuthUser);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PersonalMenuTab>('navigation');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const navigationId = useId();
  const notificationsId = useId();
  const favoritesId = useId();
  const navigate = useNavigate();
  const { api } = getServices();
  const userService = useMemo(() => new UserService(api), [api]);
  const isParticipant = user?.account_type === 'participant';
  const isOwner = user?.account_type === 'owner';

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
        ({ source, status }) => source === 'invitation' && status === 'pending'
      ),
    [notifications]
  );

  const { data: ownerNotifications } = useQuery({
    queryKey: currentUserNotificationsQueryKey(user?.id ?? 0),
    queryFn: () => userService.getAllNotifications(),
    enabled: isAuthenticated && isOwner && Boolean(user?.id),
  });

  const pendingApplicationsCount = useMemo(
    () =>
      (ownerNotifications ?? []).filter(
        ({ source, status }) => source === 'application' && status === 'pending'
      ).length,
    [ownerNotifications]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveTab('navigation');
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setActiveTab('navigation');
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
        if (
          event.relatedTarget &&
          !event.currentTarget.contains(event.relatedTarget)
        ) {
          setIsOpen(false);
          setActiveTab('navigation');
        }
      }}
    >
      <Button
        variant="tertiary"
        className={styles.personalButton}
        onClick={() => {
          if (isAuthenticated) {
            setIsOpen((open) => !open);
            setActiveTab('navigation');
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
          <div
            className={`${styles.actionIcons} ${
              isOwner ? styles.ownerActionIcons : ''
            }`}
          >
            <button
              type="button"
              aria-label="Меню"
              aria-expanded={activeTab === 'navigation'}
              aria-controls={
                activeTab === 'navigation' ? navigationId : undefined
              }
              className={`${styles.iconWrapper} ${
                activeTab === 'navigation' ? styles.iconWrapperActive : ''
              }`}
              onClick={() => setActiveTab('navigation')}
            >
              <Icon name="burgerM" size={44} />
            </button>
            <div className={styles.notificationsWrapper}>
              <button
                type="button"
                aria-label={
                  isParticipant
                    ? `Ожидающих приглашений: ${invitations.length}`
                    : `Заявки, ожидают ответа: ${pendingApplicationsCount}`
                }
                aria-expanded={
                  isParticipant ? activeTab === 'notifications' : undefined
                }
                aria-controls={
                  isParticipant && activeTab === 'notifications'
                    ? notificationsId
                    : undefined
                }
                className={`${styles.iconWrapper} ${
                  activeTab === 'notifications' ? styles.iconWrapperActive : ''
                }`}
                onClick={() => {
                  if (isParticipant) {
                    setActiveTab('notifications');
                  } else {
                    setIsOpen(false);
                    setActiveTab('navigation');
                    navigate('/requests');
                  }
                }}
              >
                <Icon name="notifications" size={44} />
              </button>
              {isParticipant
                ? invitations.length > 0 && (
                    <span className={styles.counter}>{invitations.length}</span>
                  )
                : pendingApplicationsCount > 0 && (
                    <span className={styles.counter}>
                      {pendingApplicationsCount}
                    </span>
                  )}
            </div>
            {isParticipant && (
              <button
                type="button"
                aria-label="Избранное"
                aria-expanded={activeTab === 'favorites'}
                aria-controls={
                  activeTab === 'favorites' ? favoritesId : undefined
                }
                className={`${styles.iconWrapper} ${
                  activeTab === 'favorites' ? styles.iconWrapperActive : ''
                }`}
                onClick={() => setActiveTab('favorites')}
              >
                <Icon name="like" size={44} />
              </button>
            )}
          </div>
          {isParticipant && activeTab === 'notifications' ? (
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
                            setActiveTab('navigation');
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
          ) : isParticipant && activeTab === 'favorites' ? (
            <section
              className={styles.notificationsPanel}
              id={favoritesId}
              aria-label="Избранные проекты"
            >
              <Link
                to="/favorites"
                className={styles.notificationLink}
                onClick={() => {
                  setIsOpen(false);
                  setActiveTab('navigation');
                }}
              >
                Открыть избранные проекты
              </Link>
            </section>
          ) : (
            <nav id={navigationId} aria-label="Личный кабинет">
              <ul className={styles.personalList}>
                {links.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={styles.link}
                      onClick={() => {
                        setIsOpen(false);
                        setActiveTab('navigation');
                      }}
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
