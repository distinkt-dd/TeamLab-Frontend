import styles from './SpecializationCard.module.css';

interface SpecializationCardProps {
  name: string;
  onClick?: () => void;
}

export const SpecializationCard: React.FC<SpecializationCardProps> = ({
  name,
  onClick,
}: SpecializationCardProps) => {
  return (
    <button type="button" className={styles.card} onClick={onClick}>
      {name}
    </button>
  );
};
