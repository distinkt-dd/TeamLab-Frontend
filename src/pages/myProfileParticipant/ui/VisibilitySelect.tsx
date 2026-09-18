import type { ProfileVisibility } from '@entities/user/types';
import { Select } from '@shared/ui';

// Варианты соответствуют User.ProfileVisibility на бэкенде:
// public — профиль виден всем, matched_only — только участникам своих проектов,
// hidden — профиль скрыт.
const VISIBILITY_OPTIONS: { value: ProfileVisibility; label: string }[] = [
  { value: 'public', label: 'Для всех' },
  { value: 'matched_only', label: 'Только для метчей' },
  { value: 'hidden', label: 'Скрытый' },
];

interface VisibilitySelectProps {
  profileVisibility?: ProfileVisibility;
  disabled?: boolean;
  className?: string;
  onChange?: (visibility: ProfileVisibility) => void;
}

export const VisibilitySelect: React.FC<VisibilitySelectProps> = ({
  profileVisibility = 'public',
  disabled = false,
  className,
  onChange,
}) => {
  const handleChange = (nextValue: string) => {
    onChange?.(nextValue as ProfileVisibility);
  };

  return (
    <Select
      size="S"
      options={VISIBILITY_OPTIONS}
      value={profileVisibility}
      onChange={handleChange}
      disabled={disabled}
      className={className}
      labelText="Видимость профиля"
    />
  );
};
