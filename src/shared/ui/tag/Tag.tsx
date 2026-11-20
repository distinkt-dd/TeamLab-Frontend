import { Icon, Minus, Plus } from '@shared/icons';
import type { IconName } from '@shared/icons';
import type React from 'react';
import styles from './Tag.module.css';

type tagBgColor =
  | 'blue'
  | 'green'
  | 'orange'
  | 'purple'
  | 'pink'
  | 'turquoise'
  | 'yellow'
  | 'neutral';
type tagTextColor = 'black' | 'white';

export type TagVariant = 'default' | 'select';

interface TagProps {
  bgColor?: tagBgColor;
  textColor?: tagTextColor;
  variant?: TagVariant;
  children: React.ReactNode;
  className?: string;
  rightIconName?: IconName;
  rightIconSize?: number;
}

export const Tag: React.FC<TagProps> = ({
  bgColor = 'neutral',
  textColor = 'black',
  variant = 'default',
  children,
  className,
  rightIconName,
  rightIconSize = 14,
}) => {
  const tagClasses = [
    styles.tag,
    variant === 'select' ? styles.selectVariant : '',
    styles[bgColor],
    styles[textColor],
    rightIconName ? styles.withIcon : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={tagClasses}>
      {children}
      {rightIconName === 'plus' && (
        <Plus
          width={rightIconSize}
          height={rightIconSize}
          className={styles.icon}
          aria-hidden="true"
        />
      )}
      {rightIconName === 'minus' && (
        <Minus
          width={rightIconSize}
          height={rightIconSize}
          className={styles.icon}
          aria-hidden="true"
        />
      )}
      {rightIconName &&
        rightIconName !== 'plus' &&
        rightIconName !== 'minus' && (
          <Icon
            name={rightIconName}
            size={rightIconSize}
            className={styles.icon}
            aria-hidden="true"
          />
        )}
    </span>
  );
};
