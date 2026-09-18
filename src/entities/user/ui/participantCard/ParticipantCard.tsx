import { EmploymentTypeMapped, UserLevelMapped } from '@entities/user/mapped';
import { type UserPublicMock } from '@entities/user/types';
import { Button, Tag } from '@shared/ui';
import styles from './ParticipantCard.module.css';

type ParticipantProps = {
  user: UserPublicMock;
};

export const ParticipantCard = ({ user }: ParticipantProps) => {
  return (
    <div className={styles.card}>
      <div className={styles.userBlock}>
        <div className={styles.userSelf}>
          <img
            src={user.avatar ?? './assets/girl.png'}
            className={styles.image}
            alt={user.display_name}
          />
          <div className={styles.userSelfText}>
            <p className="text-l">{user.display_name}</p>
            <p className="text-s">{user.username}</p>
          </div>
        </div>
        <div className={styles.userInfo}>
          {user.level ? (
            <caption className="caption-s">
              {UserLevelMapped[user.level]}
            </caption>
          ) : (
            ''
          )}
          {user.city ? (
            <caption className="caption-s">{user.city}</caption>
          ) : (
            ''
          )}
          {user.workload_hours_per_week ? (
            <caption className="caption-s">
              {user.workload_hours_per_week} ч/нед
            </caption>
          ) : (
            ''
          )}
          {user.employment_type ? (
            <caption className="caption-s">
              {EmploymentTypeMapped[user.employment_type]}
            </caption>
          ) : (
            ''
          )}
        </div>
      </div>
      <div className={styles.skillsBlock}>
        {user.skills.map((skill) => (
          <Tag className={styles.skillBlockTag}>{skill.name}</Tag>
        ))}
      </div>
      <div className={styles.actionsBlock}>
        <Button type="button" variant="tertiary">
          В профиль
        </Button>
      </div>
    </div>
  );
};
