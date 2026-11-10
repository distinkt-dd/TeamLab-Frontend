import React, { useState } from 'react';
import styles from './Footer.module.css';
import { List } from '@shared/ui/list';
import { Icon } from '@shared/icons';
import logoDark from '/logo-dark.svg';

const footerData = {
  forSpecialists: [
    { id: 1, text: 'Проекты', url: '#' },
    { id: 2, text: 'О резюме', url: '#' },
    { id: 3, text: 'Рекомендации', url: '#' },
    { id: 4, text: 'Список статей', url: '#' },
  ],
  forOrganizers: [
    { id: 1, text: 'Создать проект', url: '#' },
    { id: 2, text: 'Поиск специалистов', url: '#' },
  ],
  system: [
    { id: 1, text: 'О проекте', url: '#' },
    { id: 2, text: 'Инвесторам', url: '#' },
    { id: 3, text: 'Персональные данные', url: '#' },
    { id: 4, text: 'ТИМЛАБ API', url: '#' },
    { id: 5, text: 'Помощь', url: '#' },
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
            <a href="#" className={styles.socialsIcon}>
              <Icon name="gmail" />
            </a>
            <a href="#" className={styles.socialsIcon}>
              <Icon name="telegram" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
