import type { EmploymentType, UserLevel } from './types';

export const UserLevelMapped: Record<UserLevel, string> = {
  junior: 'Базовый',
  middle: 'Средний',
  senior: 'Продвинутый',
};

export const EmploymentTypeMapped: Record<EmploymentType, string> = {
  full_time: 'Полный день',
  part_time: 'Совмещаю',
  combined: 'Гибридный день',
};
