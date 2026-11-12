import type { SkillLevel } from '@entities/user/types';

// Уровни навыка из контракта API (UserSkill.Level).
export const SKILL_LEVELS: SkillLevel[] = ['basic', 'middle', 'advanced'];

// Уровень, который получает новый навык: уровни выбранных навыков сохраняются,
// а менять их можно в модалке «Уровни навыков».
export const DEFAULT_SKILL_LEVEL: SkillLevel = 'basic';

// В БД у части пользователей уровень пустой (`seed_demo_data` его не заполняет),
// поэтому неизвестное значение не считаем уровнем.
export const toSkillLevel = (level: string): SkillLevel | null =>
  SKILL_LEVELS.find((value) => value === level) ?? null;
