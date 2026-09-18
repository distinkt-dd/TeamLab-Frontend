import { useAppSelector } from '@app';
import { selectIsAuthenticated } from '@features/auth';
import { Icon } from '@shared/icons';
import { Button, Search, Toggler } from '@shared/ui';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styles from './header.module.css';
import logoDark from '/logo-dark.svg';
import logoLight from '/logo-light.svg';

//TODO Список маршрутов, на которых личный кабинет не отображается
const hiddenOnRoutes = ['/login', '/register', '/profile'];

export const Header: React.FC = () => {
  //TODO: доработать при готовности логики переключения темы
  // и хранения состояния выбраной
  const [isLiteTheme, setIsLiteTheme] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  //TODO: получить значение количества уведомлений
  const counterNotifications = 0;
  //TODO: получить тип пользователя
  const userType = 'participant';

  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const shouldHidePersonalWrapper = hiddenOnRoutes.includes(location.pathname);

  //TODO: актуализировать роутинг
  const navItems = [
    { text: 'Проекты', path: '/projects' },
    { text: 'Участники', path: '/participants' },
    { text: 'Вопросы', path: '/questions' },
  ];

  //TODO: актуализировать роутинг, проверить соответствие типам
  //общие маршруты вынести в базу
  let personalNavItems;

  if (userType === 'participant') {
    personalNavItems = [
      { text: 'Проекты', path: '#' },
      { text: 'Профиль', path: '#' },
      { text: 'Настройки', path: '#' },
    ];
  } else {
    personalNavItems = [
      { text: 'Участники', path: '/participants' },
      { text: 'Профиль', path: '#' },
      { text: 'Настройки', path: '#' },
    ];
  }

  // TODO: получить данные из хранилища
  const suggestions: string[] = [
    'графический дизайнер',
    'художник',
    'back разработчик',
    'front разработчик',
    'маркетолог',
    'геймдевелопер',
    'звук и музыка',
    'контент и тексты',
  ];

  // TODO: получить данные из хранилища
  const searchHistory: string[] = [
    'графический дизайнер',
    'художник',
    'back разработчик',
    'front разработчик',
    'маркетолог',
    'геймдевелопер',
    'звук и музыка',
    'контент и тексты',
  ];

  const closeDropdown = () => {
    setIsDropdownOpen(false);
    if (dropdownTimeout.current) {
      clearTimeout(dropdownTimeout.current);
    }
  };

  useEffect(() => {
    return () => {
      if (dropdownTimeout.current) {
        clearTimeout(dropdownTimeout.current);
      }
    };
  }, []);

  const handlePersonalMouseEnter = () => {
    if (!isAuthenticated) {
      return;
    }
    if (dropdownTimeout.current) {
      clearTimeout(dropdownTimeout.current);
    }
    setIsDropdownOpen(true);
  };

  const handlePersonalMouseLeave = () => {
    dropdownTimeout.current = setTimeout(() => {
      setIsDropdownOpen(false);
    }, 300);
  };

  // Авторизованный пользователь переходит в личный кабинет (/my-profile),
  // гость — на страницу входа
  const handlePersonalButtonClick = () => {
    closeDropdown();
    navigate(isAuthenticated ? '/my-profile' : '/login');
  };

  // TODO: доработать логику клика по иконкам в дропдауне личного кабинета
  const handleNotificationsClick = () => {
    closeDropdown();
  };
  const handleFavoritesClick = () => {
    closeDropdown();
  };
  const handleMenuClick = () => {
    closeDropdown();
  };

  // TODO: доработать обработку запроса на поиск
  const handleSearchClick = (value: string) => {
    console.log('Ищем ', value);
  };

  return (
    <div className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logoWrapper}>
          <img src={isLiteTheme ? logoLight : logoDark} alt="ТИМЛАБ" />
        </div>
        <nav className={styles.nav}>
          <ul className={styles.list}>
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={styles.link}
                  aria-current={
                    location.pathname === item.path ? 'page' : undefined
                  }
                >
                  {item.text}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.controlsWrapper}>
          <Search
            onSearch={handleSearchClick}
            suggestions={suggestions}
            searchHistory={searchHistory}
            maxSuggestions={7}
          />
          {!shouldHidePersonalWrapper && (
            <div
              className={styles.personalWrapper}
              onMouseEnter={handlePersonalMouseEnter}
              onMouseLeave={handlePersonalMouseLeave}
              onFocus={handlePersonalMouseEnter}
              onBlur={handlePersonalMouseLeave}
              aria-haspopup="true"
              aria-expanded={isDropdownOpen && isAuthenticated}
            >
              <Button
                variant="tertiary"
                className={styles.personalButton}
                onClick={handlePersonalButtonClick}
                aria-label={
                  isAuthenticated
                    ? 'перейти в личный кабинет'
                    : 'войти в личный кабинет'
                }
              >
                Личный кабинет
              </Button>
              {isDropdownOpen && isAuthenticated && (
                <div className={styles.dropdown}>
                  <div className={styles.actionIcons}>
                    <button
                      type="button"
                      aria-label="меню"
                      className={styles.iconWrapper}
                      onClick={handleMenuClick}
                    >
                      <Icon name="burgerM" size={44} />
                    </button>
                    <div className={styles.notificationsWrapper}>
                      <button
                        type="button"
                        aria-label="уведомления"
                        className={styles.iconWrapper}
                        onClick={handleNotificationsClick}
                      >
                        <Icon name="notifications" size={44} />
                      </button>
                      <span className={styles.counter}>
                        {counterNotifications}
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label="избранное"
                      className={styles.iconWrapper}
                      onClick={handleFavoritesClick}
                    >
                      <Icon name="like" size={44} />
                    </button>
                  </div>
                  <nav>
                    <ul className={styles.personalList}>
                      {personalNavItems.map((item) => (
                        <li key={item.path}>
                          <Link
                            to={item.path}
                            className={styles.link}
                            onClick={closeDropdown}
                            aria-current={
                              location.pathname === item.path
                                ? 'page'
                                : undefined
                            }
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
          )}
          <Toggler
            type="theme"
            checked={isLiteTheme}
            onChange={setIsLiteTheme}
          />
        </div>
      </div>
    </div>
  );
};
