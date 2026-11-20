import type { ProjectTagColor } from '../types';

const FIELD_COLORS: Readonly<Record<string, ProjectTagColor>> = {
  'дизайн': 'green',
  'звук и музыка': 'purple',
  'контент': 'yellow',
  'маркетинг и продвижение': 'pink',
  'разработка': 'blue',
  'съемки и продакшн': 'orange',
  'продукт': 'turquoise',
};

const normalizeFieldName = (fieldName: string) =>
  fieldName.trim().toLocaleLowerCase('ru-RU').replaceAll('ё', 'е');

export const getProjectTagColor = (fieldName?: string): ProjectTagColor =>
  fieldName
    ? (FIELD_COLORS[normalizeFieldName(fieldName)] ?? 'neutral')
    : 'neutral';
