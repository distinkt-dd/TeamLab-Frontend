import { Icon } from '@shared/icons';
import { Search, Toggler } from '@shared/ui';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PersonalMenu } from './PersonalMenu';
import styles from './header.module.css';
import logoDark from '/logo-dark.svg';
import logoLight from '/logo-light.svg';

//TODO Список маршрутов, на которых личный кабинет не отображается
const hiddenOnRoutes = ['/login', '/register', '/profile'];

export const Header: React.FC = () => {
  //TODO: доработать при готовности логики переключения темы
  // и хранения состояния выбраной
  const [isLiteTheme, setIsLiteTheme] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuId = useId();

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!mobileMenuRef.current?.contains(event.target as Node))
        setIsMobileMenuOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const personalMenu = mobileMenuRef.current?.querySelector(
          `.${styles.personalWrapper}`
        );
        if (
          personalMenu?.contains(event.target as Node) &&
          personalMenu.querySelector('[aria-expanded="true"]')
        )
          return;
        setIsMobileMenuOpen(false);
        mobileMenuRef.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMobileMenuOpen]);

  const location = useLocation();

  const shouldHidePersonalWrapper = hiddenOnRoutes.includes(location.pathname);

  //TODO: актуализировать роутинг
  const navItems = [
    { text: 'Проекты', path: '/projects' },
    { text: 'Участники', path: '/participants' },
    { text: 'Вопросы', path: '/questions' },
  ];

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

  // TODO: доработать обработку запроса на поиск
  const handleSearchClick = (value: string) => {
    console.log('Ищем ', value);
  };

  return (
    <div className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logoWrapper} aria-label="На главную">
          <img src={isLiteTheme ? logoLight : logoDark} alt="ТИМЛАБ" />
        </Link>
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
            overlay
            onSearch={handleSearchClick}
            suggestions={suggestions}
            searchHistory={searchHistory}
            maxSuggestions={7}
          />
          <div className={styles.desktopControls}>
            {!shouldHidePersonalWrapper && <PersonalMenu />}
            <Toggler
              type="theme"
              checked={isLiteTheme}
              onChange={setIsLiteTheme}
            />
          </div>
          <div className={styles.mobileMenu} ref={mobileMenuRef}>
            <button
              type="button"
              className={styles.mobileMenuButton}
              aria-label={isMobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
              aria-expanded={isMobileMenuOpen}
              aria-controls={isMobileMenuOpen ? mobileMenuId : undefined}
              onClick={() => setIsMobileMenuOpen((open) => !open)}
            >
              <Icon name={isMobileMenuOpen ? 'close' : 'burgerM'} size={32} />
            </button>
            {isMobileMenuOpen && (
              <div className={styles.mobilePanel} id={mobileMenuId}>
                <nav aria-label="Основная навигация">
                  <ul className={styles.mobileList}>
                    {navItems.map((item) => (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          className={styles.link}
                          aria-current={
                            location.pathname === item.path ? 'page' : undefined
                          }
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {item.text}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
                {!shouldHidePersonalWrapper && <PersonalMenu />}
                <div className={styles.mobileTheme}>
                  <span>Тема</span>
                  <Toggler
                    type="theme"
                    checked={isLiteTheme}
                    onChange={setIsLiteTheme}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
