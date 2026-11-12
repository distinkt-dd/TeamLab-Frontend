import type { EmploymentType, SkillLevel, UserLevel } from './types';

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

// Подписи групп навыков (UserSkill.level) в блоке «Мои навыки».
export const SkillLevelMapped: Record<SkillLevel, string> = {
  advanced: 'Продвинутый уровень',
  middle: 'Средний уровень',
  basic: 'Базовый уровень',
};
