import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EmploymentType, UserLevel } from '@entities/user/types';
import { Filter, type FilterOption, type FilterSelect } from '@features/filter';
import { Button, Tag } from '@shared/ui';
import blueFuzz from '@entities/specialization/assets/blue_fuzz.png';
import pinkFuzz from '@entities/specialization/assets/pink_fuzz.png';
import violetFuzz from '@widgets/loginForm/assets/violet_fuzz.png';
import { useRequests } from './model/useRequests';
import styles from './RequestsPage.module.css';

const VISIBLE_SKILLS_COUNT = 4;

const PERIOD_OPTIONS: FilterOption[] = [
  { value: 'day', label: 'За день' },
  { value: 'week', label: 'За неделю' },
  { value: 'month', label: 'За месяц' },
  { value: 'year', label: 'За год' },
  { value: 'all', label: 'За все время' },
];

const levelLabels: Record<UserLevel, string> = {
  junior: 'Базовый',
  middle: 'Средний',
  senior: 'Продвинутый',
};

const employmentLabels: Record<EmploymentType, string> = {
  full_time: 'Не совмещаю',
  part_time: 'Частичная занятость',
  combined: 'Совмещаю',
};

interface RequestsFilters {
  fieldIds: string[];
  tagIds: string[];
  city: string;
  period: string;
}

const emptyFilters: RequestsFilters = {
  fieldIds: [],
  tagIds: [],
  city: '',
  period: 'month',
};

const padDatePart = (value: number) => String(value).padStart(2, '0');

const formatDate = (value: string) => {
  const date = new Date(value);

  return [
    padDatePart(date.getDate()),
    padDatePart(date.getMonth() + 1),
    String(date.getFullYear()).slice(-2),
  ].join('.');
};

const formatTime = (value: string) => {
  const date = new Date(value);

  return [padDatePart(date.getHours()), padDatePart(date.getMinutes())].join(
    ':'
  );
};

const getPeriodStart = (period: string): Date | null => {
  if (!period || period === 'all') return null;

  const date = new Date();

  if (period === 'day') {
    date.setDate(date.getDate() - 1);
    return date;
  }

  if (period === 'week') {
    date.setDate(date.getDate() - 7);
    return date;
  }

  if (period === 'month') {
    date.setMonth(date.getMonth() - 1);
    return date;
  }

  if (period === 'year') {
    date.setFullYear(date.getFullYear() - 1);
    return date;
  }

  return null;
};

const getInitials = (displayName: string, username: string) => {
  const nameParts = displayName.trim().split(/\s+/).filter(Boolean);
  const source = nameParts.length > 0 ? nameParts : [username];

  return source
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};

const getImageUrl = (avatar: string | null, baseUrl: string) => {
  if (!avatar) return null;
  if (/^https?:\/\//.test(avatar)) return avatar;

  try {
    const apiUrl = new URL(baseUrl);
    return `${apiUrl.origin}${avatar}`;
  } catch {
    return avatar;
  }
};

export const RequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    applications,
    isPending,
    error,
    fieldOptions,
    skillOptions,
    specializationFieldIdById,
    baseUrl,
  } = useRequests();
  const [draftFilters, setDraftFilters] =
    useState<RequestsFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<RequestsFilters>(emptyFilters);

  const cityOptions = useMemo(() => {
    const uniqueCities = Array.from(
      new Set(
        applications
          .map((application) => application.user.city)
          .filter((city): city is string => Boolean(city))
      )
    ).sort((left, right) => left.localeCompare(right, 'ru'));

    return uniqueCities.map((city) => ({
      value: city,
      label: city,
    }));
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const periodStart = getPeriodStart(appliedFilters.period);

    return applications.filter((application) => {
      const user = application.user;

      if (appliedFilters.fieldIds.length > 0) {
        const fieldId = user.specialization_id
          ? specializationFieldIdById.get(user.specialization_id)
          : undefined;

        if (
          fieldId === undefined ||
          !appliedFilters.fieldIds.includes(String(fieldId))
        ) {
          return false;
        }
      }

      if (
        appliedFilters.tagIds.length > 0 &&
        !user.skills.some((skill) =>
          appliedFilters.tagIds.includes(String(skill.skill_id))
        )
      ) {
        return false;
      }

      if (appliedFilters.city && user.city !== appliedFilters.city) {
        return false;
      }

      if (
        periodStart &&
        new Date(application.created_at).getTime() < periodStart.getTime()
      ) {
        return false;
      }

      return true;
    });
  }, [applications, appliedFilters, specializationFieldIdById]);

  const filterSelects: FilterSelect[] = [
    {
      key: 'fields',
      multiple: true,
      options: fieldOptions,
      value: draftFilters.fieldIds,
      onChange: (fieldIds) =>
        setDraftFilters((filters) => ({ ...filters, fieldIds })),
      labelText: 'Все направления',
      disabled: fieldOptions.length === 0,
    },
    {
      key: 'tags',
      multiple: true,
      variant: 'tags',
      options: skillOptions,
      value: draftFilters.tagIds,
      onChange: (tagIds) =>
        setDraftFilters((filters) => ({ ...filters, tagIds })),
      labelText: 'Теги',
      disabled: skillOptions.length === 0,
    },
    {
      key: 'period',
      options: PERIOD_OPTIONS,
      value: draftFilters.period,
      onChange: (period) =>
        setDraftFilters((filters) => ({ ...filters, period })),
      labelText: 'За месяц',
    },
    {
      key: 'city',
      options: cityOptions,
      value: draftFilters.city,
      onChange: (city) => setDraftFilters((filters) => ({ ...filters, city })),
      labelText: 'Город',
      disabled: cityOptions.length === 0,
    },
  ];

  const handleReset = () => {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <section className={styles.section}>
          <Button
            variant="back"
            className={styles.backButton}
            onClick={() => navigate('/')}
          >
            На главную
          </Button>
          <h2 className={styles.title}>Заявки</h2>

          <Filter
            className={styles.filter}
            selects={filterSelects}
            onApply={() => setAppliedFilters(draftFilters)}
            onReset={handleReset}
            showReset={false}
          />

          {isPending && <p className={styles.state}>Загружаем заявки...</p>}

          {!isPending && error && (
            <p className={styles.state} role="alert">
              {error}
            </p>
          )}

          {!isPending && !error && filteredApplications.length === 0 && (
            <p className={styles.state}>
              {applications.length === 0
                ? 'Новых заявок пока нет.'
                : 'По выбранным фильтрам заявок нет.'}
            </p>
          )}

          {!isPending && !error && filteredApplications.length > 0 && (
            <ul className={styles.list}>
              {filteredApplications.map((application, index) => {
                const user = application.user;
                const avatar = getImageUrl(user.avatar, baseUrl);
                const visibleSkills = user.skills.slice(
                  0,
                  VISIBLE_SKILLS_COUNT
                );
                const hiddenSkillsCount =
                  user.skills.length - visibleSkills.length;
                const shouldShowPurpleDecor = index === 0;
                const shouldShowBlueDecor =
                  filteredApplications.length >= 3 && index === 2;
                const shouldShowPinkDecor =
                  filteredApplications.length >= 4 &&
                  index === filteredApplications.length - 1;

                return (
                  <li className={styles.card} key={application.id}>
                    <div className={styles.date}>
                      <time dateTime={application.created_at}>
                        {formatDate(application.created_at)}
                      </time>
                      <time dateTime={application.created_at}>
                        {formatTime(application.created_at)}
                      </time>
                    </div>

                    <div className={styles.cardBody}>
                      {shouldShowPurpleDecor && (
                        <img
                          className={`${styles.cardDecor} ${styles.cardDecorPurple}`}
                          src={violetFuzz}
                          alt=""
                          aria-hidden="true"
                        />
                      )}
                      {shouldShowBlueDecor && (
                        <img
                          className={`${styles.cardDecor} ${styles.cardDecorBlue}`}
                          src={blueFuzz}
                          alt=""
                          aria-hidden="true"
                        />
                      )}
                      {shouldShowPinkDecor && (
                        <img
                          className={`${styles.cardDecor} ${styles.cardDecorPink}`}
                          src={pinkFuzz}
                          alt=""
                          aria-hidden="true"
                        />
                      )}
                      <div className={styles.personBlock}>
                        <div className={styles.person}>
                          {avatar ? (
                            <img
                              className={styles.avatar}
                              src={avatar}
                              alt={user.display_name}
                            />
                          ) : (
                            <span className={styles.avatarFallback}>
                              {getInitials(user.display_name, user.username)}
                            </span>
                          )}

                          <div className={styles.info}>
                            <h3 className={styles.name}>
                              {user.specialization_name ?? 'Не указана'}
                            </h3>
                            <p className={styles.username}>{user.username}</p>
                          </div>
                        </div>

                        <ul className={styles.meta}>
                          <li>
                            {user.level ? levelLabels[user.level] : 'Не указан'}
                          </li>
                          <li>{user.city ?? 'Не указан'}</li>
                          <li>
                            {user.workload_hours_per_week
                              ? `${user.workload_hours_per_week} ч/нед`
                              : 'Не указано'}
                          </li>
                          <li>
                            {user.employment_type
                              ? employmentLabels[user.employment_type]
                              : 'Не указано'}
                          </li>
                        </ul>
                      </div>

                      <div className={styles.tags}>
                        {visibleSkills.map((skill) => (
                          <Tag key={skill.id}>{skill.name}</Tag>
                        ))}
                        {hiddenSkillsCount > 0 && (
                          <Tag>ещё {hiddenSkillsCount}</Tag>
                        )}
                      </div>

                      <Button
                        variant="tertiary"
                        className={styles.profileButton}
                        onClick={() => navigate(`/participants/${user.id}`)}
                      >
                        В профиль
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
};
