import type { Field } from '@entities/field/types';
import type { Specialization } from '@entities/specialization/types';
import { REGISTRATION_DIRECTIONS } from '@entities/user';

// Приводим названия к сравнимому виду: регистр, «ё» и разделители не должны мешать сопоставлению.
const normalizeName = (value: string): string =>
  value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/g, ' ')
    .trim();

// Направление в форме и область (Field) в справочнике бэкенда называются по-разному
// («Контент и тексты» против «Контент»), поэтому дополнительно сравниваем по вхождению.
const isSameDirection = (fieldName: string, directionName: string): boolean =>
  fieldName === directionName ||
  fieldName.includes(directionName) ||
  directionName.includes(fieldName);

// Бэкенд требует у участника конкретную specialization_id, а в форме выбирается направление:
// находим область по названию и берём специализацию из неё.
export const resolveSpecializationId = (
  direction: string,
  fields: Field[],
  specializations: Specialization[]
): number => {
  const option = REGISTRATION_DIRECTIONS.find(
    (item) => item.value === direction
  );

  if (!option) {
    throw new Error('Выберите специализацию из списка.');
  }

  const directionName = normalizeName(option.label);
  const field = fields.find((item) => {
    const fieldName = normalizeName(item.name);
    return fieldName !== '' && isSameDirection(fieldName, directionName);
  });

  if (!field) {
    throw new Error(
      `Направление «${option.label}» пока недоступно при регистрации. Выберите другое направление.`
    );
  }

  const specialization = specializations.find(
    (item) => item.field_id === field.id
  );

  if (!specialization) {
    throw new Error(
      `Для направления «${option.label}» нет специализаций в справочнике. Выберите другое направление.`
    );
  }

  return specialization.id;
};
