import { ProjectItem } from '@entities/project';
import type { ProjectCardItem } from '@entities/project/types';
import styles from './ProjectsList.module.css';

interface ProjectsListProps {
  data: ProjectCardItem[];
  className?: string;
  showProjectActions?: boolean;
}

export const ProjectsList: React.FC<ProjectsListProps> = ({
  data,
  className,
  showProjectActions,
}) => {
  return (
    <div className={[styles.container, className].filter(Boolean).join(' ')}>
      <ul className={styles.list}>
        {data.map((proj) => (
          <ProjectItem
            id={proj.id}
            name={proj.name}
            image={proj.image}
            tags={proj.tags}
            showProjectActions={showProjectActions}
            key={proj.id}
          />
        ))}
      </ul>
    </div>
  );
};
