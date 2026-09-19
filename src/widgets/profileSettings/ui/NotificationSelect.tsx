import { Select } from '@shared/ui';

type NotificationValue = 'enabled' | 'disabled';

const NOTIFICATION_OPTIONS: { value: NotificationValue; label: string }[] = [
  { value: 'enabled', label: 'Включены' },
  { value: 'disabled', label: 'Выключены' },
];

interface NotificationSelectProps {
  notificationEnabled?: boolean;
  disabled?: boolean;
  className?: string;
  onChange?: (enabled: boolean) => void;
}

export const NotificationSelect: React.FC<NotificationSelectProps> = ({
  notificationEnabled = false,
  disabled = false,
  className,
  onChange,
}) => {
  const handleChange = (nextValue: string) => {
    onChange?.(nextValue === 'enabled');
  };

  return (
    <Select
      size="S"
      options={NOTIFICATION_OPTIONS}
      value={notificationEnabled ? 'enabled' : 'disabled'}
      onChange={handleChange}
      disabled={disabled}
      className={className}
      labelText="Уведомления"
    />
  );
};
