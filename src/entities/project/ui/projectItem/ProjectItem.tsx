import { Fragment } from 'react';
import { Button, Tag } from '@shared/ui';
import { Link, useNavigate } from 'react-router-dom';
import type { ProjectCardMember, ProjectCardTag } from '../../types';
import styles from './ProjectItem.module.css';

interface ProjectItemProps {
  id: number;
  name: string;
  image?: string;
  tags?: ProjectCardTag[];
  members?: ProjectCardMember[];
  showProjectActions?: boolean;
}

export const ProjectItem: React.FC<ProjectItemProps> = ({
  id,
  name,
  image,
  tags,
  members,
  showProjectActions = false,
}: ProjectItemProps) => {
  const navigate = useNavigate();
  const hasProjectId = Number.isInteger(id) && id > 0;
  const memberRows = members ?? [];
  const hasMembers = memberRows.length > 0;

  return (
    <li className={styles.item} key={id}>
      <div className={styles.row}>
        <div className={styles.left}>
          {image ? (
            <img src={image} alt="Проект" className={styles.image} />
          ) : (
            <span className={styles.imageFallback} aria-hidden="true">
              {name.charAt(0)}
            </span>
          )}
          {hasProjectId ? (
            <Link
              to={`/projects/${id}`}
              className={`${styles.name} ${styles.nameLink}`}
            >
              {name}
            </Link>
          ) : (
            <span className={styles.name}>{name}</span>
          )}
        </div>
        {hasMembers && (
          <dl className={styles.members}>
            {memberRows.map((member) => (
              <Fragment key={member.roleId}>
                <dt className={styles.memberRole}>
                  <Tag className={styles.memberRoleTag}>{member.roleName}</Tag>
                </dt>
                <dd className={styles.memberParticipants}>
                  {member.participants.length > 0 ? (
                    member.participants.map((participant, index) => (
                      <Fragment key={participant.id}>
                        {index > 0 && ', '}
                        <Link
                          className={styles.memberLink}
                          to={`/participants/${participant.id}`}
                        >
                          {participant.name}
                        </Link>
                      </Fragment>
                    ))
                  ) : (
                    <span className={styles.memberVacancy}>
                      Вакансия свободна
                    </span>
                  )}
                </dd>
              </Fragment>
            ))}
          </dl>
        )}
        <div className={styles.right}>
          {tags && tags.length > 0 && (
            <div className={styles.tags}>
              {tags.map((tag, index) => (
                <Tag
                  className={styles.tag}
                  bgColor={tag.color ?? 'neutral'}
                  key={tag.id ?? `${tag.label}-${index}`}
                >
                  {tag.label}
                </Tag>
              ))}
            </div>
          )}
          {showProjectActions ? (
            <div className={styles.actions}>
              <Button
                className={styles.iconButton}
                iconName="trashM"
                aria-label={`Удалить проект «${name}»`}
              />
              <Button
                className={styles.iconButton}
                iconName="editM"
                aria-label={`Редактировать проект «${name}»`}
                onClick={() => navigate(`/edit-project/${id}`)}
              />
            </div>
          ) : (
            <Button
              variant="tertiary"
              className={styles.button}
              onClick={() => {
                if (hasProjectId) navigate(`/projects/${id}`);
              }}
              disabled={!hasProjectId}
            >
              К проекту
            </Button>
          )}
        </div>
      </div>
    </li>
  );
};
