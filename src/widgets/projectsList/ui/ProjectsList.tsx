import { ProjectItem } from '@entities/project';
import styles from './ProjectsList.module.css';

interface Project {
  id: number;
  name: string;
  image?: string;
  tags: string[];
}

interface ProjectsListProps {
  data: Project[];
  className?: string;
}

export const ProjectsList: React.FC<ProjectsListProps> = ({
  data,
  className,
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
            key={proj.id}
          />
        ))}
      </ul>
    </div>
  );
};
