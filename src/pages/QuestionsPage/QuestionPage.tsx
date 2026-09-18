import { useNavigate } from 'react-router-dom';
import { Button } from '@shared/ui/button';
import styles from './QuestionPage.module.css';

export const QuestionsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <Button
          variant="back"
          className={styles.backButton}
          onClick={() => navigate('/')}
        >
          На главную
        </Button>
        <section className={styles.section}>
          <h2 className={styles.title}>Вопросы</h2>
        </section>
      </div>
    </div>
  );
};
