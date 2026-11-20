import React, { useState } from 'react';
import styles from './Footer.module.css';
import { List } from '@shared/ui/list';
import { Icon } from '@shared/icons';
import logoDark from '/logo-dark.svg';

const footerData = {
  forSpecialists: [
    { id: 1, text: 'Проекты', url: '/projects' },
    { id: 2, text: 'О резюме' },
    { id: 3, text: 'Рекомендации' },
    { id: 4, text: 'Список статей' },
  ],
  forOrganizers: [
    { id: 1, text: 'Создать проект' },
    { id: 2, text: 'Поиск специалистов', url: '/participants' },
  ],
  system: [
    { id: 1, text: 'О проекте' },
    { id: 2, text: 'Инвесторам' },
    { id: 3, text: 'Персональные данные', url: '/policy' },
    { id: 4, text: 'ТИМЛАБ API' },
    { id: 5, text: 'Помощь', url: '/questions' },
  ],
};

const teamMembers = [
  { role: 'Дизайнер', names: ['@Asheskali'] },
  { role: 'Фронтенд', names: ['@Zigyoygiz', '@Grankin_Sasha', '@Hhajimeone'] },
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
          <List title="Специалистам" items={footerData.forSpecialists} />
          <List title="Организаторам" items={footerData.forOrganizers} />
          <List title="Система" items={footerData.system} />
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
          <div className={styles.socials}>
            <span className={styles.socialsIcon} aria-label="Email">
              <Icon name="gmail" />
            </span>
            <span className={styles.socialsIcon} aria-label="Telegram">
              <Icon name="telegram" />
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
