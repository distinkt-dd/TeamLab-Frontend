import styles from './Button.module.css';
import { Icon } from '@shared/icons';
import type { IconName } from '@shared/icons';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'search' | 'back';
type ButtonType = 'button' | 'submit';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  type?: ButtonType;
  iconName?: IconName;
  iconSize?: number;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  type = 'button',
  iconName,
  iconSize = 44,
  className,
  children,
  ...props
}) => {
  const buttonClasses = [
    styles.button,
    iconName ? styles.withIcon : '',
    styles[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={buttonClasses} {...props} type={type}>
      {variant === 'back' && <Icon name="arrowLeftCircleS" />}
      {children}
      {iconName && (
        <Icon
          name={iconName}
          size={iconSize}
          className={styles.icon}
          aria-hidden="true"
        />
      )}
      {variant === 'tertiary' && <Icon name="arrowNortheast" />}
      {variant === 'search' && <Icon name="search" />}
    </button>
  );
};
