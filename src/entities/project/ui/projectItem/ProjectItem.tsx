import { Button, Tag } from '@shared/ui';
import styles from './ProjectItem.module.css';
import { useNavigate } from 'react-router-dom';

interface ProjectItemProps {
  id: number;
  name: string;
  image?: string;
  tags?: string[];
}

export const ProjectItem: React.FC<ProjectItemProps> = ({
  id,
  name,
  image,
  tags,
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
            {tags.map((tag, i) => (
              <Tag key={i}>{tag}</Tag>
            ))}
          </div>
        )}
        <Button
          variant="tertiary"
          className={styles.button}
          onClick={() => navigate(`/projects/${id}`)}
        >
          К проекту
        </Button>
      </div>
    </li>
  );
};
