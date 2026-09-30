import { EmploymentTypeMapped, UserLevelMapped } from '@entities/user/mapped';
import { type UserPublic } from '@entities/user/types';
import { Button, Tag } from '@shared/ui';
import styles from './ParticipantCard.module.css';

type ParticipantProps = {
  user: UserPublic;
};

export const ParticipantCard = ({ user }: ParticipantProps) => {
  return (
    <div className={styles.card}>
      <div className={styles.userBlock}>
        <div className={styles.userSelf}>
          <img
            src={user.avatar ?? '/girl.png'}
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
            <span className="caption-s">{UserLevelMapped[user.level]}</span>
          ) : (
            ''
          )}
          {user.city ? <span className="caption-s">{user.city}</span> : ''}
          {user.workload_hours_per_week ? (
            <span className="caption-s">
              {user.workload_hours_per_week} ч/нед
            </span>
          ) : (
            ''
          )}
          {user.employment_type ? (
            <span className="caption-s">
              {EmploymentTypeMapped[user.employment_type]}
            </span>
          ) : (
            ''
          )}
        </div>
      </div>
      <div className={styles.skillsBlock}>
        {user.skills.map((skill) => (
          <Tag className={styles.skillBlockTag} key={skill.id}>
            {skill.name}
          </Tag>
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
