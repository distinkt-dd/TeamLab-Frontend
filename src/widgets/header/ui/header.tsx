import { getServices, useAppSelector } from '@app';
import { SkillService } from '@entities/skill';
import { SpecializationService } from '@entities/specialization';
import { Icon } from '@shared/icons';
import { selectAuthUser, selectIsAuthenticated } from '@features/auth';
import { Search, Toggler, type SearchCatalog } from '@shared/ui';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PersonalMenu } from './PersonalMenu';
import styles from './header.module.css';
import logoDark from '/logo-dark.svg';
import logoLight from '/logo-light.svg';

//TODO Список маршрутов, на которых личный кабинет не отображается
const hiddenOnRoutes = ['/login', '/register', '/profile'];

const headerNavItems = [
  { text: 'Проекты', path: '/projects', enabled: true },
  { text: 'Участники', path: '/participants', enabled: true },
  { text: 'Вопросы', path: '/#faq', enabled: true },
];

const visibleHeaderNavItems = headerNavItems.filter((item) => item.enabled);

const popularSearches = [
  'графический дизайнер',
  'художник',
  'back разработчик',
  'front разработчик',
  'маркетолог',
  'геймдевелопер',
  'звук и музыка',
];

export const Header: React.FC = () => {
  //TODO: доработать при готовности логики переключения темы
  // и хранения состояния выбраной
  const [isLiteTheme, setIsLiteTheme] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [explicitSearchCatalog, setExplicitSearchCatalog] =
    useState<SearchCatalog | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuId = useId();
  const navigate = useNavigate();
  const authUser = useAppSelector(selectAuthUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const defaultSearchCatalog: SearchCatalog =
    isAuthenticated && authUser?.account_type === 'owner'
      ? 'participants'
      : 'projects';
  const searchCatalog = explicitSearchCatalog ?? defaultSearchCatalog;
  const { api } = getServices();
  const specializationService = useMemo(
    () => new SpecializationService(api),
    [api]
  );
  const skillService = useMemo(() => new SkillService(api), [api]);
  const specializationsQuery = useQuery({
    queryKey: ['specializations'],
    queryFn: () => specializationService.list(),
  });
  const skillsQuery = useQuery({
    queryKey: ['skills'],
    queryFn: () => skillService.list({ ordering: 'name' }),
  });

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
  const isNavItemActive = (path: string) => {
    const [pathname, hash] = path.split('#');

    return (
      location.pathname === pathname &&
      (!hash || location.hash === `#${hash}`)
    );
  };

  const referenceSuggestions = useMemo(
    () => [
      ...(specializationsQuery.data ?? []).map(({ name }) => name),
      ...(skillsQuery.data ?? []).map(({ name }) => name),
    ],
    [skillsQuery.data, specializationsQuery.data]
  );

  const currentSearch =
    location.pathname === '/projects' || location.pathname === '/participants'
      ? new URLSearchParams(location.search).get('search') || ''
      : '';

  const handleSearchClick = (value: string) => {
    const search = value.trim();
    if (!search) return;

    const targetPath = `/${searchCatalog}`;
    const params =
      location.pathname === targetPath
        ? new URLSearchParams(location.search)
        : new URLSearchParams();
    params.set('search', search);
    const target = `${targetPath}?${params.toString()}`;

    if (`${location.pathname}${location.search}` !== target) navigate(target);
  };

  return (
    <div className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logoWrapper} aria-label="На главную">
          <img src={isLiteTheme ? logoLight : logoDark} alt="ТИМЛАБ" />
        </Link>
        <nav className={styles.nav}>
          <ul className={styles.list}>
            {visibleHeaderNavItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={styles.link}
                  aria-current={isNavItemActive(item.path) ? 'page' : undefined}
                >
                  {item.text}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.controlsWrapper}>
          <Search
            key={`${location.pathname}|${currentSearch}`}
            overlay
            onSearch={handleSearchClick}
            catalog={searchCatalog}
            onCatalogChange={setExplicitSearchCatalog}
            initialValue={currentSearch}
            popularSuggestions={popularSearches}
            suggestions={referenceSuggestions}
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
                    {visibleHeaderNavItems.map((item) => (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          className={styles.link}
                          aria-current={
                            isNavItemActive(item.path) ? 'page' : undefined
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
