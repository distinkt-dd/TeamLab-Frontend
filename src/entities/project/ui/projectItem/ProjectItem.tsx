import { Button, Tag } from '@shared/ui';
import { useNavigate } from 'react-router-dom';
import type { ProjectCardTag } from '../../types';
import styles from './ProjectItem.module.css';

interface ProjectItemProps {
  id: number;
  name: string;
  image?: string;
  tags?: ProjectCardTag[];
  showProjectActions?: boolean;
}

export const ProjectItem: React.FC<ProjectItemProps> = ({
  id,
  name,
  image,
  tags,
  showProjectActions = false,
}: ProjectItemProps) => {
  const navigate = useNavigate();

  return (
    <li className={styles.item} key={id}>
      <div className={styles.left}>
        {image ? (
          <img src={image} alt="Проект" className={styles.image} />
        ) : (
          <span className={styles.imageFallback} aria-hidden="true">
            {name.charAt(0)}
          </span>
        )}
        <span className={styles.name}>{name}</span>
      </div>
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
            onClick={() => navigate(`/projects/${id}`)}
          >
            К проекту
          </Button>
        )}
      </div>
    </li>
  );
};
