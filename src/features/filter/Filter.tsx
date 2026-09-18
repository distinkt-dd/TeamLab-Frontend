import { useState } from 'react';
import { Select } from '@shared/ui/select';
import { Button } from '@shared/ui/button';
import styles from './Filter.module.css';

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectBase {
  key: string;
  labelText: string;
  options: FilterOption[];
  disabled?: boolean;
}

interface SingleFilterSelect extends FilterSelectBase {
  multiple?: false;
  variant?: 'default';
  value: string;
  onChange: (value: string) => void;
}

interface MultiFilterSelect extends FilterSelectBase {
  multiple: true;
  variant?: 'default';
  value: string[];
  onChange: (value: string[]) => void;
}

interface TagsFilterSelect extends FilterSelectBase {
  multiple: true;
  variant: 'tags';
  value: string[];
  onChange: (value: string[]) => void;
}

export type FilterSelect =
  | SingleFilterSelect
  | MultiFilterSelect
  | TagsFilterSelect;

const DIRECTION_OPTIONS = [
  { value: 'design', label: 'Дизайн' },
  { value: 'sound', label: 'Звук и музыка' },
  { value: 'content', label: 'Контент и тексты' },
  { value: 'creative-management', label: 'Креативное управление' },
  { value: 'marketing', label: 'Маркетинг и продвижение' },
  { value: 'development', label: 'Разработка' },
  { value: 'production', label: 'Съемки и продакшн' },
  { value: 'product-management', label: 'Управление продуктом' },
];

const TAG_OPTIONS = [
  { value: 'graphic-designer', label: 'графический дизайнер' },
  { value: 'web-designer', label: 'веб-дизайнер' },
  { value: 'ux-ui', label: 'UX/UI дизайнер' },
  { value: 'front', label: 'front разработчик' },
  { value: 'back', label: 'back разработчик' },
  { value: 'marketer', label: 'маркетолог' },
  { value: 'copywriter', label: 'копирайтер' },
  { value: 'smm', label: 'SMM' },
];

const PERIOD_OPTIONS = [
  { value: 'day', label: 'За день' },
  { value: 'week', label: 'За неделю' },
  { value: 'month', label: 'За месяц' },
  { value: 'year', label: 'За год' },
  { value: 'all', label: 'За все время' },
];

interface FilterProps {
  className?: string;
  selects?: FilterSelect[];
  applyText?: string;
  resetText?: string;
  onApply?: () => void;
  onReset?: () => void;
  showReset?: boolean;
}

export const Filter: React.FC<FilterProps> = ({
  className,
  selects,
  applyText = 'Применить',
  resetText = 'Сбросить фильтры',
  onApply,
  onReset,
  showReset = true,
}) => {
  const [directions, setDirections] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [period, setPeriod] = useState('');

  const defaultSelects: FilterSelect[] = [
    {
      key: 'directions',
      multiple: true,
      options: DIRECTION_OPTIONS,
      value: directions,
      onChange: setDirections,
      labelText: 'Все направления',
    },
    {
      key: 'tags',
      multiple: true,
      variant: 'tags',
      options: TAG_OPTIONS,
      value: tags,
      onChange: setTags,
      labelText: 'Теги',
    },
    {
      key: 'period',
      options: PERIOD_OPTIONS,
      value: period,
      onChange: setPeriod,
      labelText: 'За месяц',
    },
  ];

  const filterSelects = selects ?? defaultSelects;

  const handleReset = () => {
    if (!selects) {
      setDirections([]);
      setTags([]);
      setPeriod('');
    }
    onReset?.();
  };

  return (
    <div className={[styles.filter, className].filter(Boolean).join(' ')}>
      <div className={styles.selectContainer}>
        {filterSelects.map((select) => (
          <div className={styles.selectWrap} key={select.key}>
            {select.multiple && select.variant === 'tags' ? (
              <Select
                multiple
                variant="tags"
                size="S"
                options={select.options}
                value={select.value}
                onChange={select.onChange}
                labelText={select.labelText}
                disabled={select.disabled}
              />
            ) : select.multiple ? (
              <Select
                multiple
                size="S"
                options={select.options}
                value={select.value}
                onChange={select.onChange}
                labelText={select.labelText}
                disabled={select.disabled}
              />
            ) : (
              <Select
                size="S"
                options={select.options}
                value={select.value}
                onChange={select.onChange}
                labelText={select.labelText}
                disabled={select.disabled}
              />
            )}
            {select.multiple && select.value.length > 0 && (
              <span className={styles.badge} aria-hidden="true">
                {select.value.length}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className={styles.buttonContainer}>
        <Button variant="secondary" onClick={onApply}>
          {applyText}
        </Button>
        {showReset && (
          <button className={styles.resetButton} onClick={handleReset}>
            {resetText}
          </button>
        )}
      </div>
    </div>
  );
};
