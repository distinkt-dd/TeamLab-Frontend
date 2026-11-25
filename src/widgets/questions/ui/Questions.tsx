import { QuestionItem } from './QuestionItem';
import styles from './Questions.module.css';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const questionsData = [
  {
    question: 'Это бесплатно?',
    answer:
      'Да, сейчас TeamLab полностью бесплатен. Регистрация, поиск проектов, отклики и участие в командах ничего не стоят. В будущем могут появиться дополнительные платные возможности, например продвижение проектов на главной.',
  },
  {
    question: 'Для кого подходит платформа?',
    answer:
      'Для авторов проектов, которые ищут специалистов, и для участников, которые хотят найти команду, применить навыки, получить опыт и пополнить портфолио.',
    additional:
      'В профиле участника можно указать специализацию, навыки, опыт и работы портфолио.',
  },
  {
    question: 'Как происходит подбор команды?',
    answer:
      'Участник находит проекты по направлению, специализации, навыкам и поисковому запросу, выбирает подходящую роль и отправляет заявку. Автор проекта изучает отклики и профили, принимает или отклоняет заявки, а также может сам отправить приглашение подходящему специалисту. После принятия заявки или приглашения участник входит в команду. Только после этого автору проекта становятся доступны контакты участника, чтобы связаться с ним вне TeamLab.',
    additional:
      'Не забудьте указать контакты в профиле — после принятия в команду автор проекта сможет с вами связаться.',
  },
  {
    question: 'Можно ли участвовать в нескольких проектах одновременно?',
    answer:
      'Да, TeamLab не ограничивает количество проектов. Оценивайте свою загрузку и указывайте в профиле, сколько часов в неделю вы готовы уделять участию.',
    additional:
      'Берите столько задач, сколько реально сможете выполнить.',
  },
  {
    question: 'Как выйти из проекта, если мы не сработаемся?',
    answer:
      'Откройте карточку проекта и нажмите «Прекратить участие». Перед выходом передайте команде нужные материалы и предупредите о своём решении по доступным вам каналам. После выхода повторно присоединиться к этому проекту нельзя.',
    additional:
      'Выход закрывает ваше текущее участие и не отправляет новую заявку.',
  },
];

export const Questions: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const location = useLocation();

  useEffect(() => {
    if (location.hash !== '#faq') return;

    const animationFrame = window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      sectionRef.current?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [location.hash, location.key]);

  return (
    <section id="faq" ref={sectionRef} className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.title}>Часто задаваемые вопросы</h2>
        <ul className={styles.list}>
          {questionsData.map((item, index) => (
            <li key={item.question}>
              <QuestionItem
                question={item.question}
                answer={item.answer}
                additional={item.additional}
                isOpen={openIndex === index}
                onToggle={() =>
                  setOpenIndex(openIndex === index ? null : index)
                }
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
