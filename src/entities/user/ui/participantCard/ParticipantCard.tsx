import { EmploymentTypeMapped, UserLevelMapped } from '@entities/user/mapped';
import { type UserPublic } from '@entities/user/types';
import { Button, Tag } from '@shared/ui';
import { Link, useNavigate } from 'react-router-dom';
import styles from './ParticipantCard.module.css';

type ParticipantProps = {
  user: UserPublic;
};

const MAX_VISIBLE_SKILLS = 8;

export const ParticipantCard = ({ user }: ParticipantProps) => {
  const navigate = useNavigate();
  const hasProfileId = Number.isInteger(user.id) && user.id > 0;
  const displayName = user.display_name?.trim();
  const username = user.username.trim();
  const primaryName = displayName || username;
  const shouldShowUsername =
    !!displayName &&
    !!username &&
    displayName.toLocaleLowerCase('ru-RU') !==
      username.toLocaleLowerCase('ru-RU');
  const specialization = user.specialization_name?.trim();
  const title = specialization || primaryName;
  const fallbackSubtitle = shouldShowUsername ? username : null;
  const subtitle = specialization ? primaryName : fallbackSubtitle;
  const participantName = (
    <>
      <p className="text-l">{title}</p>
      {subtitle && <p className="text-s">{subtitle}</p>}
    </>
  );
  const visibleSkills = user.skills.slice(0, MAX_VISIBLE_SKILLS);
  const hiddenSkillsCount = user.skills.length - visibleSkills.length;
  const moreSkillsLabel = `еще ${hiddenSkillsCount}`;
  const moreSkills = hasProfileId ? (
    <Link
      to={`/participants/${user.id}`}
      className={styles.moreSkills}
      aria-label={`Все навыки участника ${primaryName}`}
    >
      {moreSkillsLabel}
    </Link>
  ) : (
    <span className={styles.moreSkills}>{moreSkillsLabel}</span>
  );

  return (
    <div className={styles.card}>
      <div className={styles.userBlock}>
        <div className={styles.userSelf}>
          <img
            src={user.avatar ?? '/girl.png'}
            className={styles.image}
            alt={primaryName}
          />
          <div className={styles.userSelfText}>
            {hasProfileId ? (
              <Link
                to={`/participants/${user.id}`}
                className={styles.userLink}
                aria-label={`Открыть профиль ${primaryName}`}
              >
                {participantName}
              </Link>
            ) : (
              participantName
            )}
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
        {visibleSkills.map((skill) => (
          <Tag key={skill.id}>{skill.name}</Tag>
        ))}
        {hiddenSkillsCount > 0 && moreSkills}
      </div>
      <div className={styles.actionsBlock}>
        <Button
          type="button"
          variant="tertiary"
          onClick={() => {
            if (hasProfileId) navigate(`/participants/${user.id}`);
          }}
          disabled={!hasProfileId}
          aria-label={`Открыть профиль ${user.display_name}`}
        >
          В профиль
        </Button>
      </div>
    </div>
  );
};
