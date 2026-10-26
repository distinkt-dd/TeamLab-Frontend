import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getServices } from '@app';
import {
  CURRENT_USER_QUERY_KEY,
  REGISTRATION_DIRECTIONS,
  UserService,
} from '@entities/user';
import { EmploymentTypeMapped, UserLevelMapped } from '@entities/user/mapped';
import type {
  CurrentUser,
  SearchStatus,
  SocialLinks,
} from '@entities/user/types';
import styles from './EditProfilePage.module.css';
import { Button, Input } from '@shared/ui';
import { Select } from '@shared/ui/select';
import defaultAvatar from './assets/logo.svg';

// Подписи статуса поиска: для опыта и занятости карты уже есть в @entities/user/mapped.
const searchStatusLabels: Record<SearchStatus, string> = {
  looking_for_team: 'Ищу команду',
  looking_for_members: 'Ищу участников',
  not_looking: 'Не ищу',
};

// Ключи соцсетей совпадают с полями social_links из контракта API.
const socialLinkLabels: Record<keyof SocialLinks, string> = {
  telegram: 'Telegram',
  github: 'GitHub',
  vk: 'VK',
  behance: 'Behance',
  instagram: 'Instagram',
};

const toOptions = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

// Черновик полей блока «Коротко о себе»: показываем данные пользователя,
// а правки держим локально — сохранение подключим следующим шагом.
interface WorkFieldsDraft {
  name: string;
  city: string;
  workload: string;
  searchStatus: string;
  level: string;
  employmentType: string;
  social: string;
  socialLink: string;
}

const toWorkFieldsDraft = (user: CurrentUser): WorkFieldsDraft => ({
  name: user.display_name,
  city: user.city ?? '',
  workload: user.workload_hours_per_week?.toString() ?? '',
  searchStatus: user.search_status ?? '',
  level: user.level ?? '',
  employmentType: user.employment_type ?? '',
  social: '',
  socialLink: '',
});

// Минимальный каркас страницы редактирования профиля: поля показывают данные
// текущего пользователя, сохранение подключим следующим шагом.
export const EditProfilePage: React.FC = () => {
  const { api } = getServices();
  const userService = useMemo(() => new UserService(api), [api]);

  const {
    data: user,
    isPending,
    isError,
  } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => userService.getCurrent(),
  });

  const [draft, setDraft] = useState<WorkFieldsDraft | null>(null);

  if (isPending) {
    return <p>Загрузка...</p>;
  }

  if (isError) {
    return <p role="alert">Ошибка загрузки профиля</p>;
  }

  if (!user) {
    return null;
  }

  const fields = draft ?? toWorkFieldsDraft(user);

  const handleChange = (key: keyof WorkFieldsDraft, value: string) =>
    setDraft({ ...fields, [key]: value });

  return (
    <div className={styles.container}>
      <section className={styles.headSection}>
        <div className={styles.logoSection}>
          <div>
            {user.avatar ? (
              <img src={user.avatar} alt="Аватар" width={120} height={120} />
            ) : (
              <img
                src={defaultAvatar}
                alt="Аватар по умолчанию"
                width={120}
                height={120}
              />
            )}
            <Button variant="tertiary">Добавить фото</Button>
          </div>
          <div className={styles.aboutSection}>
            <label className={styles.field}>
              <select className={styles.field__select} defaultValue="" required>
                <option value="" disabled hidden>
                  Специализация
                </option>
                {REGISTRATION_DIRECTIONS.map((direction) => (
                  <option key={direction.value} value={direction.value}>
                    {direction.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.bioField}>
              <textarea
                className={styles.bioTextarea}
                rows={4}
                defaultValue={user.bio ?? ''}
                placeholder="Напиши здесь о ваших софтскилах, о целях, о том, какие качества вы в себе цените"
              />
            </label>
          </div>
        </div>

        <div className={styles.workSection}>
          <div className={styles.fields}>
            <Input
              labelText="Имя"
              value={fields.name}
              onChange={(event) => handleChange('name', event.target.value)}
            />
            <Input
              labelText="Город"
              value={fields.city}
              onChange={(event) => handleChange('city', event.target.value)}
            />
            <Input
              labelText="Время активной работы, ч/нед"
              type="number"
              min={1}
              value={fields.workload}
              onChange={(event) => handleChange('workload', event.target.value)}
            />
            <Select
              labelText="Статус поиска"
              options={toOptions(searchStatusLabels)}
              value={fields.searchStatus}
              onChange={(value) => handleChange('searchStatus', value)}
              fullWidth
            />
            <Select
              labelText="Опыт"
              options={toOptions(UserLevelMapped)}
              value={fields.level}
              onChange={(value) => handleChange('level', value)}
              fullWidth
            />
            <Select
              labelText="Тип занятости"
              options={toOptions(EmploymentTypeMapped)}
              value={fields.employmentType}
              onChange={(value) => handleChange('employmentType', value)}
              fullWidth
            />
          </div>

          <div className={styles.connectSection}>
            <Select
              size="S"
              labelText="Соцсеть"
              options={toOptions(socialLinkLabels)}
              value={fields.social}
              onChange={(value) => handleChange('social', value)}
            />
            <div className={styles.linkField}>
              <Input
                labelText="Ссылка на профиль"
                placeholder="https://"
                type="url"
                value={fields.socialLink}
                onChange={(event) =>
                  handleChange('socialLink', event.target.value)
                }
              />
            </div>
            <Button
              className={styles.addSocialButton}
              iconName="plus"
              iconSize={24}
              aria-label="Добавить соцсеть"
            />
          </div>
        </div>
      </section>
      <h2>Мои навыки</h2>
      {/* Список навыков добавим следующим шагом. */}
    </div>
  );
};
