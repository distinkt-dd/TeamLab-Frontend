import type { UserPublicMock } from '@entities/user/types';
import { Filter } from '@features/filter';
import { Button } from '@shared/ui';
import { ParticipantsList } from '@widgets/participantsList';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import styles from './ParticipantsPage.module.css';
import mock_img6 from './assets/girl.png';

const mockUsers: UserPublicMock[] = [
  {
    id: 5,
    username: 'second_project_owner',
    display_name: 'Project Owner',
    avatar: mock_img6,
    specialization_id: null,
    level: 'senior',
    city: 'Санкт-Петербург',
    workload_hours_per_week: 32,
    work_format: null,
    employment_type: 'full_time',
    skills: [],
    search_status: null,
  },
  {
    id: 4,
    username: 'demo_member',
    display_name: 'Member Demo',
    avatar: mock_img6,
    specialization_id: 2,
    specialization_name: 'Frontend-разработчик',
    level: 'middle',
    city: 'Казань',
    workload_hours_per_week: 24,
    work_format: null,
    employment_type: 'full_time',
    skills: [
      {
        id: 6,
        user_id: 4,
        skill_id: 5,
        name: 'React',
        level: '',
        created_at: '2026-07-12T14:39:32.471460Z',
        updated_at: '2026-07-12T14:39:32.471470Z',
      },
    ],
    search_status: null,
  },
  {
    id: 3,
    username: 'demo_designer',
    display_name: 'Designer Demo',
    avatar: mock_img6,
    specialization_id: 5,
    specialization_name: 'UX/UI-дизайнер',
    level: 'senior',
    city: 'Санкт-Петербург',
    workload_hours_per_week: 40,
    work_format: null,
    employment_type: 'full_time',
    skills: [
      {
        id: 4,
        user_id: 3,
        skill_id: 6,
        name: 'Figma',
        level: '',
        created_at: '2026-07-12T14:39:32.470346Z',
        updated_at: '2026-07-12T14:39:32.470356Z',
      },
      {
        id: 5,
        user_id: 3,
        skill_id: 7,
        name: 'UX-исследования',
        level: '',
        created_at: '2026-07-12T14:39:32.470900Z',
        updated_at: '2026-07-12T14:39:32.470917Z',
      },
    ],
    search_status: null,
  },
  {
    id: 2,
    username: 'demo_backend',
    display_name: 'Backend Demo',
    avatar: mock_img6,
    specialization_id: 1,
    specialization_name: 'Backend-разработчик',
    level: 'junior',
    city: 'Москва',
    workload_hours_per_week: 12,
    work_format: null,
    employment_type: 'full_time',
    skills: [
      {
        id: 3,
        user_id: 2,
        skill_id: 3,
        name: 'DRF',
        level: '',
        created_at: '2026-07-12T14:39:32.469777Z',
        updated_at: '2026-07-12T14:39:32.469788Z',
      },
      {
        id: 2,
        user_id: 2,
        skill_id: 2,
        name: 'Django',
        level: '',
        created_at: '2026-07-12T14:39:32.469216Z',
        updated_at: '2026-07-12T14:39:32.469227Z',
      },
      {
        id: 1,
        user_id: 2,
        skill_id: 1,
        name: 'Python',
        level: '',
        created_at: '2026-07-12T14:39:32.468513Z',
        updated_at: '2026-07-12T14:39:32.468525Z',
      },
    ],
    search_status: null,
  },
  {
    id: 1,
    username: 'demo_owner',
    display_name: 'Demo Owner',
    avatar: mock_img6,
    specialization_id: null,
    level: 'middle',
    city: 'Москва',
    workload_hours_per_week: 24,
    work_format: null,
    employment_type: 'full_time',
    skills: [],
    search_status: null,
  },
];

export const ParticipantsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/');
  };

  return (
    <>
      <img
        src="./violet-fuzz.png"
        alt="magenta-deep"
        aria-hidden
        className={clsx(styles.decorateImg, styles.vfPng)}
      />
      <img
        src="./magenta-deep.png"
        alt="magenta-deep"
        aria-hidden
        className={clsx(styles.decorateImg, styles.mdPng)}
      />
      <img
        src="./wavy-blue.png"
        alt="magenta-deep"
        aria-hidden
        className={clsx(styles.decorateImg, styles.wbPng)}
      />
      <div className={styles.container}>
        <section className={styles.section}>
          <Button
            className={styles.buttonBack}
            type="button"
            variant="back"
            onClick={() => handleBack()}
          >
            На главную
          </Button>
          <h2 className={styles.title}>Все участники</h2>
          <Filter />
          <ParticipantsList users={mockUsers} />
          <Button type="button" className={styles.buttonMore}>
            Показать еще
          </Button>
        </section>
      </div>
    </>
  );
};
