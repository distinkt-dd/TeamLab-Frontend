import styles from './SpecializationCard.module.css';

interface SpecializationCardProps {
  name: string;
  disabled?: boolean;
  onClick?: () => void;
}

export const SpecializationCard: React.FC<SpecializationCardProps> = ({
  name,
  disabled = false,
  onClick,
}: SpecializationCardProps) => {
  return (
    <button
      type="button"
      className={styles.card}
      disabled={disabled}
      onClick={onClick}
      title={disabled ? 'Направление временно недоступно' : undefined}
    >
      {name}
    </button>
  );
};
