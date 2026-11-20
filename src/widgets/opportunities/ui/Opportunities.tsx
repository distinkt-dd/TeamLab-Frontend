import { SpecializationCards } from '@entities/specialization';
import styles from './Opportunities.module.css';
import { FindTeam } from './FindTeam';
import clouds from '../assets/clouds.png';
import { useNavigate } from 'react-router-dom';

const mock_specializations = [
  {
    id: 1,
    name: 'Управление продуктом',
  },
  {
    id: 2,
    name: 'Дизайн',
  },
  {
    id: 3,
    name: 'Разработка',
  },
  {
    id: 4,
    name: 'AI',
  },
  {
    id: 5,
    name: 'Съемки и продакшн',
  },
  {
    id: 6,
    name: 'Все профили',
  },
];

const steps_data = [
  {
    title: 'Создай карточку проекта',
    text: 'Опиши идею, цель проекта и формат участия, чтобы участники понимали задачи и ожидания',
  },
  {
    title: 'Укажи, какие роли есть в проекте',
    text: 'Добавь нужные специализации, навыки\n и теги — это поможет найти подходящих участников',
  },
  {
    title: 'Получай отклики\n от участников',
    text: 'Просматривай профили участников, общайся и выбирай тех, кто лучше всего подходит',
  },
];

export const Opportunities: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.titleContainer}>
          <h2 className={styles.title}>Открыт набор участников в проекты</h2>
          <span className={styles.signature}>
            Посмотрите проекты, где нужны специалисты вашего профиля
          </span>
        </div>
        <SpecializationCards
          data={mock_specializations}
          onSelect={() => navigate('/projects')}
        />
      </div>
      <FindTeam data={steps_data} />
      <img src={clouds} className={styles.img} aria-hidden="true" />
    </section>
  );
};
