import { Button, Tag } from '@shared/ui';
import { Icon } from '@shared/icons';
import type { ProjectCardItem } from '@entities/project';
import { useNavigate } from 'react-router-dom';
import styles from './FavoriteProjectCard.module.css';

export type FavoriteProjectCardLayout = 'wide' | 'narrow';

interface FavoriteProjectCardProps {
  project: ProjectCardItem;
  layout: FavoriteProjectCardLayout;
  isRemoving: boolean;
  onRemove: (projectId: number) => void;
}

export const FavoriteProjectCard: React.FC<FavoriteProjectCardProps> = ({
  project,
  layout,
  isRemoving,
  onRemove,
}) => {
  const navigate = useNavigate();

  const avatar = project.image ? (
    <img src={project.image} alt="" className={styles.avatar} />
  ) : (
    <span className={styles.avatarFallback} aria-hidden="true">
      {project.name.charAt(0)}
    </span>
  );

  const favoriteButton = (
    <button
      type="button"
      className={styles.favoriteButton}
      onClick={() => onRemove(project.id)}
      disabled={isRemoving}
      aria-label={`Убрать проект «${project.name}» из избранного`}
    >
      <Icon name="like" size={44} />
    </button>
  );

  return (
    <li
      className={[styles.card, styles[layout]].join(' ')}
      aria-busy={isRemoving}
    >
      <div className={styles.head}>
        {layout === 'narrow' ? (
          <div className={styles.avatarRow}>
            {avatar}
            {favoriteButton}
          </div>
        ) : (
          avatar
        )}
        <span className={styles.name}>{project.name}</span>
        {layout === 'wide' && favoriteButton}
      </div>
      <div className={styles.footer}>
        {project.tags.length > 0 && (
          <div className={styles.tags}>
            {project.tags.map((tag, index) => (
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
        <Button
          variant="tertiary"
          className={styles.button}
          onClick={() => navigate(`/projects/${project.id}`)}
        >
          К проекту
        </Button>
      </div>
    </li>
  );
};
