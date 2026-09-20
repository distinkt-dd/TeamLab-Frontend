export interface RegistrationDirection {
  value: string;
  label: string;
}

// Направления, доступные при регистрации.
// Список совпадает с фильтром направлений (features/filter) и формами регистрации.
export const REGISTRATION_DIRECTIONS: RegistrationDirection[] = [
  { value: 'design', label: 'Дизайн' },
  { value: 'sound', label: 'Звук и музыка' },
  { value: 'content', label: 'Контент и тексты' },
  { value: 'creative-management', label: 'Креативное управление' },
  { value: 'marketing', label: 'Маркетинг и продвижение' },
  { value: 'development', label: 'Разработка' },
  { value: 'production', label: 'Съемки и продакшн' },
  { value: 'product-management', label: 'Управление продуктом' },
];

// Данные формы регистрации: у участника и владельца набор полей одинаковый.
// Направление приходит слагом и превращается в specialization_id уже при запросе.
export interface RegisterFormData {
  email: string;
  username: string;
  password: string;
  direction: string;
}
