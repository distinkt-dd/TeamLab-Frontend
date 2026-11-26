import React, { useState } from 'react';
import styles from './Footer.module.css';
import { List } from '@shared/ui/list';
import { Icon } from '@shared/icons';
import logoDark from '/logo-dark.svg';

const footerData = {
  forSpecialists: [
    { id: 1, text: 'Проекты', url: '/projects', enabled: true },
    { id: 2, text: 'О резюме', enabled: false },
    { id: 3, text: 'Рекомендации', enabled: false },
    { id: 4, text: 'Список статей', enabled: false },
  ],
  forOrganizers: [
    { id: 1, text: 'Создать проект', enabled: false },
    {
      id: 2,
      text: 'Поиск специалистов',
      url: '/participants',
      enabled: true,
    },
  ],
  system: [
    { id: 1, text: 'О проекте', enabled: false },
    { id: 2, text: 'Инвесторам', enabled: false },
    {
      id: 3,
      text: 'Персональные данные',
      url: '/policy',
      enabled: true,
    },
    { id: 4, text: 'ТИМЛАБ API', enabled: false },
    { id: 5, text: 'Помощь', url: '/questions', enabled: false },
  ],
};

const visibleFooterData = {
  forSpecialists: footerData.forSpecialists.filter((item) => item.enabled),
  forOrganizers: footerData.forOrganizers.filter((item) => item.enabled),
  system: footerData.system.filter((item) => item.enabled),
};

const teamMembers = [
  { role: 'Дизайнер', names: ['@Asheskali'] },
  {
    role: 'Фронтенд',
    names: ['@Zigyoygiz', '@Grankin_Sasha', '@Hhajimeone', '@Djrazzz'],
  },
  { role: 'Бэкенд', names: ['@Ihulir'] },
];

export const Footer: React.FC = () => {
  const [isTeamVisible, setIsTeamVisible] = useState(false);

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.logoSection}>
          <div className={styles.logo}>
            <img src={logoDark} alt="ТИМЛАБ" />
          </div>
          <span className={styles.copyright}>© 2026«ТИМЛАБ»</span>
        </div>

        <nav className={styles.navSection}>
          <List
            title="Специалистам"
            items={visibleFooterData.forSpecialists}
          />
          <List
            title="Организаторам"
            items={visibleFooterData.forOrganizers}
          />
          <List title="Система" items={visibleFooterData.system} />
        </nav>

        <div className={styles.extraSection}>
          {isTeamVisible && (
            <div className={styles.teamCard}>
              {teamMembers.map((group) => (
                <div key={group.role} className={styles.memberGroup}>
                  <p className={styles.roleTitle}>{group.role}</p>
                  <div className={styles.namesList}>
                    {group.names.map((name) => (
                      <span key={name}>{name} </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            className={styles.teamButton}
            onClick={() => setIsTeamVisible(!isTeamVisible)}
          >
            КОМАНДА <br />
            ТИМЛАБ <Icon name="arrowNortheast" />
          </button>
          <div className={styles.socials} aria-label="Контакты TeamLab">
            <a
              className={styles.contactLink}
              href="mailto:teamlab.project@yandex.ru"
            >
              <Icon name="gmail" />
              <span>teamlab.project@yandex.ru</span>
            </a>
            <a
              className={styles.contactLink}
              href="https://t.me/teamlab_project"
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="telegram" />
              <span>@teamlab_project</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
