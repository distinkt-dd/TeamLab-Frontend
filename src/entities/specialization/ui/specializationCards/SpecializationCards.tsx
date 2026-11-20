import styles from './SpecializationCards.module.css';
import { SpecializationCard } from './specializationCard/SpecializationCard';
import topLeftImg from '../../assets/pink_fuzz.png';
import rightBottomImg from '../../assets/blue_fuzz.png';

interface Specialization {
  id: number | string;
  name: string;
  disabled?: boolean;
}

interface SpecializationCardsProps {
  data: Specialization[];
  onSelect?: (id: number | string) => void;
}

export const SpecializationCards: React.FC<SpecializationCardsProps> = ({
  data,
  onSelect,
}) => {
  return (
    <div className={styles.specializationCards}>
      <img src={topLeftImg} aria-hidden="true" className={styles.TLImg} />
      <ul className={styles.list}>
        {data.map((item) => (
          <li key={item.id}>
            <SpecializationCard
              name={item.name}
              disabled={item.disabled}
              onClick={onSelect ? () => onSelect(item.id) : undefined}
            />
          </li>
        ))}
      </ul>
      <img src={rightBottomImg} aria-hidden="true" className={styles.RBImg} />
    </div>
  );
};
