import { ArrowRight } from '@shared/icons';
import styles from './Stepper.module.css';

interface StepperProps {
  max: number;
  current?: number;
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  max,
  current,
  className,
}) => {
  return (
    <ul className={[styles.stepper, className].filter(Boolean).join(' ')}>
      {Array.from({ length: max }, (_, i) => i + 1).map((step, index) => (
        <li key={step} className={styles.item}>
          <span
            className={
              step === current
                ? `${styles.step} ${styles.current}`
                : styles.step
            }
          >
            {step}
          </span>
          {index < max - 1 && <ArrowRight />}
        </li>
      ))}
    </ul>
  );
};
