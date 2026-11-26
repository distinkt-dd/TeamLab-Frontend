import { useId } from 'react';
import { Link } from 'react-router-dom';
import styles from './RegistrationLegalNotice.module.css';

interface RegistrationLegalNoticeProps {
  accepted: boolean;
  onChange: (accepted: boolean) => void;
}

export const RegistrationLegalNotice: React.FC<
  RegistrationLegalNoticeProps
> = ({ accepted, onChange }) => {
  const checkboxId = useId();

  return (
    <div className={styles.legalNotice}>
      <div className={styles.agreementRow}>
        <input
          id={checkboxId}
          className={styles.checkbox}
          type="checkbox"
          name="termsAccepted"
          checked={accepted}
          onChange={(event) => onChange(event.target.checked)}
          required
        />
        <p>
          <label htmlFor={checkboxId}>Я принимаю условия </label>
          <Link
            to="/terms"
            className={styles.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            Пользовательского соглашения
          </Link>
        </p>
      </div>

      <p className={styles.privacyNotice}>
        С порядком обработки персональных данных можно ознакомиться в{' '}
        <Link
          to="/policy"
          className={styles.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          Политике обработки персональных данных.
        </Link>
      </p>
    </div>
  );
};
