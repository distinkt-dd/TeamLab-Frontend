import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getServices } from '@app';
import { FieldService } from '@entities/field';
import type { ImageUploadStage } from '@entities/image-upload';
import { SpecializationService } from '@entities/specialization';
import {
  CURRENT_USER_QUERY_KEY,
  REGISTRATION_DIRECTIONS,
  UserService,
} from '@entities/user';
import { useImageUpload } from '@features/image-upload';
import { resolveSpecializationId } from '@features/auth/lib/resolveSpecializationId';
import { EmploymentTypeMapped, UserLevelMapped } from '@entities/user/mapped';
import type {
  CurrentUser,
  EmploymentType,
  SearchStatus,
  SocialLinks,
  UserLevel,
  UserUpdateRequest,
} from '@entities/user/types';
import styles from './EditProfilePage.module.css';
import { Button, Input } from '@shared/ui';
import { Icon } from '@shared/icons';
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

// Вид отображения работ в секции «Мои работы»: по макету активна сетка.
type WorksView = 'list' | 'grid';

// Черновик полей блока «Коротко о себе»: правки хранятся
// локально до отправки PATCH /users/me/.
interface WorkFieldsDraft {
  name: string;
  bio: string;
  direction: string;
  city: string;
  workload: string;
  searchStatus: string;
  level: string;
  employmentType: string;
  social: string;
  socialLink: string;
  socialLinks: SocialLinks;
}

const toWorkFieldsDraft = (user: CurrentUser): WorkFieldsDraft => {
  const socialLinks = { ...(user.social_links ?? {}) };
  const [social = '', socialLink = ''] = Object.entries(socialLinks)[0] ?? [];

  return {
    name: user.display_name,
    bio: user.bio ?? '',
    direction: '',
    city: user.city ?? '',
    workload: user.workload_hours_per_week?.toString() ?? '',
    searchStatus: user.search_status ?? '',
    level: user.level ?? '',
    employmentType: user.employment_type ?? '',
    social,
    socialLink,
    socialLinks,
  };
};

const avatarStageLabels: Partial<Record<ImageUploadStage, string>> = {
  creating: 'Подготавливаем загрузку…',
  uploading: 'Загружаем фото…',
  confirming: 'Проверяем файл…',
  processing: 'Обрабатываем фото…',
  attaching: 'Обновляем аватар…',
};

const getActionErrorText = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  return error.message.replace(/^Request failed with status \d+:\s*/, '');
};

// Поля инициализируются данными current user; аватар и остальной
// профиль сохраняются независимыми backend-операциями.
export const EditProfilePage: React.FC = () => {
  const { api } = getServices();
  const queryClient = useQueryClient();
  const userService = useMemo(() => new UserService(api), [api]);
  const fieldService = useMemo(() => new FieldService(api), [api]);
  const specializationService = useMemo(
    () => new SpecializationService(api),
    [api]
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    previewUrl,
    stage: avatarStage,
    error: uploadError,
    isUploading,
    startUpload,
    cancelUpload,
    reset: resetUpload,
  } = useImageUpload();

  const {
    data: user,
    isPending,
    isError,
  } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => userService.getCurrent(),
  });

  const [draft, setDraft] = useState<WorkFieldsDraft | null>(null);
  const [worksView, setWorksView] = useState<WorksView>('grid');
  const [isWorksHintVisible, setIsWorksHintVisible] = useState(true);
  const [isAvatarUpdating, setIsAvatarUpdating] = useState(false);
  const [isAvatarDeleting, setIsAvatarDeleting] = useState(false);
  const [avatarActionError, setAvatarActionError] = useState<string | null>(
    null
  );
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);

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

  const handleChange = (key: keyof WorkFieldsDraft, value: string) => {
    setProfileError(null);
    setProfileStatus(null);
    setDraft({ ...fields, [key]: value });
  };

  const handleSocialChange = (social: string) => {
    setProfileError(null);
    setProfileStatus(null);
    setDraft({
      ...fields,
      social,
      socialLink: fields.socialLinks[social as keyof SocialLinks] ?? '',
    });
  };

  const handleSocialLinkChange = (socialLink: string) => {
    setProfileError(null);
    setProfileStatus(null);
    setDraft({
      ...fields,
      socialLink,
      socialLinks: fields.social
        ? {
            ...fields.socialLinks,
            [fields.social]: socialLink,
          }
        : fields.socialLinks,
    });
  };

  const handleAddSocialLink = () => {
    if (!fields.social || !fields.socialLink.trim()) return;
    setDraft({ ...fields, social: '', socialLink: '' });
    setProfileError(null);
    setProfileStatus('Ссылка добавлена в черновик.');
  };

  const getViewButtonClass = (view: WorksView) =>
    [styles.viewButton, worksView === view && styles.viewButtonActive]
      .filter(Boolean)
      .join(' ');

  const refreshCurrentUser = () =>
    queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });

  const handleAvatarSelect: React.ChangeEventHandler<HTMLInputElement> = async (
    event
  ) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file || isAvatarUpdating || isAvatarDeleting || isProfileSaving) {
      return;
    }

    setAvatarActionError(null);
    setIsAvatarUpdating(true);
    try {
      const result = await startUpload({ kind: 'user_avatar', file });
      if (result?.status !== 'attached') return;

      await refreshCurrentUser();
      resetUpload();
    } finally {
      setIsAvatarUpdating(false);
    }
  };

  const handleAvatarDelete = async () => {
    if (isAvatarUpdating || isAvatarDeleting || isProfileSaving) return;

    setAvatarActionError(null);
    setIsAvatarDeleting(true);
    try {
      await userService.deleteAvatar();
      resetUpload();
      await refreshCurrentUser();
    } catch (error: unknown) {
      setAvatarActionError(
        getActionErrorText(error, 'Не удалось удалить аватар.')
      );
    } finally {
      setIsAvatarDeleting(false);
    }
  };

  const buildProfileUpdate = async (): Promise<UserUpdateRequest> => {
    const name = fields.name.trim();
    if (!name) {
      throw new Error('Укажите имя.');
    }

    const workloadText = fields.workload.trim();
    const workload = workloadText === '' ? null : Number(workloadText);
    if (
      workload !== null &&
      (!Number.isInteger(workload) || workload < 1 || workload > 168)
    ) {
      throw new Error('Нагрузка должна быть целым числом от 1 до 168.');
    }

    if (fields.socialLink.trim() && !fields.social) {
      throw new Error('Выберите соцсеть для указанной ссылки.');
    }

    let specializationId: number | undefined;
    if (fields.direction) {
      const [fieldOptions, specializations] = await Promise.all([
        fieldService.list(),
        specializationService.list(),
      ]);
      specializationId = resolveSpecializationId(
        fields.direction,
        fieldOptions,
        specializations
      );
    }

    const socialLinks = { ...fields.socialLinks };
    if (fields.social) {
      socialLinks[fields.social as keyof SocialLinks] =
        fields.socialLink.trim();
    }

    return {
      display_name: name,
      bio: fields.bio.trim(),
      city: fields.city.trim(),
      workload_hours_per_week: workload,
      level: fields.level ? (fields.level as UserLevel) : null,
      employment_type: fields.employmentType
        ? (fields.employmentType as EmploymentType)
        : null,
      search_status: fields.searchStatus
        ? (fields.searchStatus as SearchStatus)
        : null,
      social_links: socialLinks,
      ...(specializationId === undefined
        ? {}
        : { specialization_id: specializationId }),
    };
  };

  const handleProfileSave = async () => {
    if (isProfileSaving || isAvatarUpdating || isAvatarDeleting) return;

    setProfileError(null);
    setProfileStatus(null);
    setIsProfileSaving(true);
    try {
      const updatedUser = await userService.updateCurrent(
        await buildProfileUpdate()
      );
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, updatedUser);
      setDraft(toWorkFieldsDraft(updatedUser));
      setProfileStatus('Изменения сохранены.');
    } catch (error: unknown) {
      setProfileError(
        getActionErrorText(error, 'Не удалось сохранить профиль.')
      );
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleProfileReset = () => {
    if (isProfileSaving || isAvatarUpdating || isAvatarDeleting) return;
    setDraft(toWorkFieldsDraft(user));
    setProfileError(null);
    setProfileStatus(null);
  };

  const avatarError = uploadError?.message ?? avatarActionError;
  const avatarStatus = isAvatarDeleting
    ? 'Удаляем фото…'
    : avatarStageLabels[avatarStage];
  const avatarSrc = previewUrl ?? user.avatar ?? defaultAvatar;
  const isAvatarBusy = isAvatarUpdating || isAvatarDeleting;
  const isAvatarActionBlocked = isAvatarBusy || isProfileSaving;

  return (
    <div className={styles.page}>
      <div className={styles.heroBg} aria-hidden="true" />
      <div className={styles.container}>
        <section className={styles.headSection}>
          <div className={styles.logoSection}>
            <div
              className={styles.avatarSection}
              aria-busy={isAvatarActionBlocked}
            >
              <img
                className={styles.avatarPreview}
                src={avatarSrc}
                alt={
                  previewUrl || user.avatar ? 'Аватар' : 'Аватар по умолчанию'
                }
                width={120}
                height={120}
              />
              <input
                ref={fileInputRef}
                className={styles.avatarInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={isAvatarActionBlocked}
                onChange={handleAvatarSelect}
                aria-label="Выбрать фото профиля"
              />
              <Button
                variant="tertiary"
                disabled={isAvatarActionBlocked}
                onClick={() => fileInputRef.current?.click()}
              >
                {user.avatar ? 'Заменить фото' : 'Добавить фото'}
              </Button>
              {isUploading ? (
                <button
                  type="button"
                  className={styles.avatarAction}
                  onClick={cancelUpload}
                >
                  Отменить загрузку
                </button>
              ) : (
                user.avatar && (
                  <button
                    type="button"
                    className={styles.avatarAction}
                    disabled={isAvatarDeleting}
                    onClick={handleAvatarDelete}
                  >
                    <Icon name="trashS" size={24} aria-hidden="true" />
                    Удалить фото
                  </button>
                )
              )}
              {avatarStatus && (
                <p className={styles.avatarStatus} role="status">
                  {avatarStatus}
                </p>
              )}
              {avatarError && (
                <p className={styles.avatarError} role="alert">
                  {avatarError}
                </p>
              )}
            </div>
            <div className={styles.aboutSection}>
              <label className={styles.field}>
                <select
                  className={styles.field__select}
                  value={fields.direction}
                  disabled={isProfileSaving}
                  onChange={(event) =>
                    handleChange('direction', event.target.value)
                  }
                >
                  <option value="" disabled hidden>
                    {user.specialization_name ?? 'Специализация'}
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
                  value={fields.bio}
                  disabled={isProfileSaving}
                  onChange={(event) => handleChange('bio', event.target.value)}
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
                disabled={isProfileSaving}
                onChange={(event) => handleChange('name', event.target.value)}
              />
              <Input
                labelText="Город"
                value={fields.city}
                disabled={isProfileSaving}
                onChange={(event) => handleChange('city', event.target.value)}
              />
              <Input
                labelText="Время активной работы, ч/нед"
                type="number"
                min={1}
                max={168}
                value={fields.workload}
                disabled={isProfileSaving}
                onChange={(event) =>
                  handleChange('workload', event.target.value)
                }
              />
              <Select
                labelText="Статус поиска"
                options={toOptions(searchStatusLabels)}
                value={fields.searchStatus}
                disabled={isProfileSaving}
                onChange={(value) => handleChange('searchStatus', value)}
                fullWidth
              />
              <Select
                labelText="Опыт"
                options={toOptions(UserLevelMapped)}
                value={fields.level}
                disabled={isProfileSaving}
                onChange={(value) => handleChange('level', value)}
                fullWidth
              />
              <Select
                labelText="Тип занятости"
                options={toOptions(EmploymentTypeMapped)}
                value={fields.employmentType}
                disabled={isProfileSaving}
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
                disabled={isProfileSaving}
                onChange={handleSocialChange}
              />
              <div className={styles.linkField}>
                <Input
                  labelText="Ссылка на профиль"
                  placeholder="https://"
                  type="url"
                  value={fields.socialLink}
                  disabled={isProfileSaving}
                  onChange={(event) =>
                    handleSocialLinkChange(event.target.value)
                  }
                />
              </div>
              <Button
                className={styles.roundButton}
                iconName="plus"
                iconSize={24}
                disabled={
                  isProfileSaving || !fields.social || !fields.socialLink.trim()
                }
                onClick={handleAddSocialLink}
                aria-label="Добавить соцсеть"
              />
            </div>
          </div>
        </section>
        <section>
          <h2>Мои навыки</h2>
          <div className={styles.skilsSection}>
            <span className={styles.skillsLogo}></span>
            <div className={styles.skills}>
              <span>
                Пожалуйста, укажите ваши навыки. Это поможет вашей будущей
                команде принять вас к себе
              </span>
              <Button variant="primary" className={styles.letsGo}>
                Вперёд!
              </Button>
            </div>
          </div>
        </section>
        <section>
          <div className={styles.sectionHeader}>
            <h2 className={styles.worksTitle}>Мои работы</h2>
            <div className={styles.viewSwitcher}>
              <button
                type="button"
                className={getViewButtonClass('list')}
                aria-label="Показывать работы списком"
                aria-pressed={worksView === 'list'}
                onClick={() => setWorksView('list')}
              >
                <Icon name="burgerM" size={44} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={getViewButtonClass('grid')}
                aria-label="Показывать работы сеткой"
                aria-pressed={worksView === 'grid'}
                onClick={() => setWorksView('grid')}
              >
                <Icon name="grid" size={44} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className={styles.myWorks}>
            <article className={styles.workCard}>
              <div
                className={styles.workImage}
                role="img"
                aria-label="Изображение работы по умолчанию"
              />
              <div className={styles.workForm}>
                <Input placeholder="Название проекта" />
                <Input placeholder="Какая задача ставилась?" />
                <Input placeholder="Какое решение было найдено?" />
                <button type="button" className={styles.workLink}>
                  Вставить ссылку
                </button>
              </div>
            </article>

            <Button
              className={styles.roundButton}
              iconName="plus"
              iconSize={24}
              aria-label="Добавить работу"
            />

            {isWorksHintVisible && (
              <aside className={styles.worksHint}>
                <button
                  type="button"
                  className={styles.hintClose}
                  aria-label="Закрыть подсказку"
                  onClick={() => setIsWorksHintVisible(false)}
                >
                  <Icon name="close" size={12} aria-hidden="true" />
                </button>
                <p className={styles.hintText}>
                  Вы можете использовать разное позиционирование для разного
                  типа работ. Например, дизайнерам пригодится сетка
                </p>
              </aside>
            )}
          </div>
        </section>
        <section className={styles.actions}>
          <Button
            variant="primary"
            className={styles.actionButton}
            disabled={isProfileSaving || isAvatarBusy}
            onClick={handleProfileReset}
          >
            Отменить изменения
          </Button>
          <Button
            variant="secondary"
            className={styles.actionButton}
            disabled={isProfileSaving || isAvatarBusy}
            onClick={handleProfileSave}
          >
            {isProfileSaving ? 'Сохраняем…' : 'Сохранить'}
          </Button>
          {profileStatus && (
            <p className={styles.profileStatus} role="status">
              {profileStatus}
            </p>
          )}
          {profileError && (
            <p className={styles.profileError} role="alert">
              {profileError}
            </p>
          )}
        </section>
      </div>
    </div>
  );
};
