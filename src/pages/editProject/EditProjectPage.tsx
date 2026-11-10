import { getServices } from '@app';
import { FieldService } from '@entities/field';
import type { Field } from '@entities/field/types';
import { ProjectService } from '@entities/project';
import type { ProjectDetail } from '@entities/project/types';
import { ProjectRoleService } from '@entities/project-role';
import type { ImageUploadStage } from '@entities/image-upload';
import { SkillService } from '@entities/skill';
import type { Skill } from '@entities/skill/types';
import { SpecializationService } from '@entities/specialization';
import type { Specialization } from '@entities/specialization/types';
import { CURRENT_USER_QUERY_KEY, UserService } from '@entities/user';
import { useImageUpload } from '@features/image-upload';
import { Icon } from '@shared/icons';
import { Button, Input, Select } from '@shared/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import searchDecoration from '../projectCard/assets/Vibrant Gradient Cloud-no-bg-preview (carve.photos) 1.png';
import styles from './EditProjectPage.module.css';
import { RoleEditor } from './RoleEditor';
import {
  type EditProjectDraft,
  type ProjectRoleDraft,
  toEditProjectDraft,
} from './model';
import {
  type DraftValidationErrors,
  hasDraftChanges,
  hasValidationErrors,
  reconcileDraftWithServer,
  saveProjectDraft,
  validateProjectDraft,
} from './saveProjectDraft';

interface ProjectDictionaries {
  fields: Field[];
  specializations: Specialization[];
  skills: Skill[];
}

const PROJECT_TITLE_MAX_LENGTH = 255;
const PROJECT_TEXT_MAX_LENGTH = 500;

const imageStageLabels: Partial<Record<ImageUploadStage, string>> = {
  creating: 'Подготавливаем загрузку…',
  uploading: 'Загружаем изображение…',
  confirming: 'Проверяем файл…',
  processing: 'Обрабатываем изображение…',
  attaching: 'Обновляем изображение проекта…',
};

const getActionErrorText = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  return error.message.replace(/^Request failed with status \d+:\s*/, '');
};

const getResponseStatus = (error: unknown): number | null => {
  if (!(error instanceof Error)) return null;
  const match = error.message.match(/status (\d{3})/);
  return match ? Number(match[1]) : null;
};

const getProjectLoadError = (error: unknown): string => {
  const status = getResponseStatus(error);

  if (status === 403) {
    return 'У вас нет доступа к редактированию этого проекта.';
  }

  if (status === 404) {
    return 'Проект не найден.';
  }

  return 'Не удалось загрузить проект. Попробуйте обновить страницу.';
};

interface EditProjectContentProps {
  project: ProjectDetail;
  dictionaries: ProjectDictionaries;
  projectService: ProjectService;
  roleService: ProjectRoleService;
}

const EditProjectContent: React.FC<EditProjectContentProps> = ({
  project,
  dictionaries,
  projectService,
  roleService,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<EditProjectDraft>(() =>
    toEditProjectDraft(project)
  );
  const [baseline, setBaseline] = useState(project);
  const [validationErrors, setValidationErrors] =
    useState<DraftValidationErrors>({ roleErrors: {} });
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [needsServerRefresh, setNeedsServerRefresh] = useState(false);
  const [isImageUpdating, setIsImageUpdating] = useState(false);
  const [isImageDeleting, setIsImageDeleting] = useState(false);
  const [imageActionError, setImageActionError] = useState<string | null>(null);
  const [selectedRoleClientId, setSelectedRoleClientId] = useState<
    string | null
  >(() => draft.roles[0]?.clientId ?? null);
  const nextRoleClientId = useRef(1);
  const nextSkillClientId = useRef(1);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef(draft);
  const {
    previewUrl,
    stage: imageStage,
    error: imageUploadError,
    isUploading,
    startUpload,
    cancelUpload,
    reset: resetImageUpload,
  } = useImageUpload();
  const isImageBusy = isImageUpdating || isImageDeleting;

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  const fieldOptions = useMemo(
    () =>
      dictionaries.fields.map((field) => ({
        value: String(field.id),
        label: field.name,
      })),
    [dictionaries.fields]
  );
  const statusOptions = useMemo(
    () => [
      { value: 'open', label: 'Идёт набор' },
      { value: 'closed', label: 'Набор закрыт' },
    ],
    []
  );

  const updateDraft = <Key extends keyof EditProjectDraft>(
    field: Key,
    value: EditProjectDraft[Key]
  ) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setValidationErrors((current) => ({
      ...current,
      [field === 'fieldId' ? 'fieldId' : field]: undefined,
    }));
    setSaveErrors([]);
    setSaveMessage(null);
  };

  const selectedRole =
    draft.roles.find(({ clientId }) => clientId === selectedRoleClientId) ??
    null;
  const usedSpecializationIds = new Set(
    draft.roles.map(({ specializationId }) => specializationId)
  );
  const availableSpecializations = dictionaries.specializations.filter(
    (specialization) =>
      specialization.field_id === draft.fieldId &&
      !usedSpecializationIds.has(specialization.id)
  );
  const selectedRoleSpecializations = selectedRole
    ? dictionaries.specializations.filter(
        (specialization) =>
          specialization.id === selectedRole.specializationId ||
          (specialization.field_id === draft.fieldId &&
            !draft.roles.some(
              (role) =>
                role.clientId !== selectedRole.clientId &&
                role.specializationId === specialization.id
            ))
      )
    : [];
  const selectedSkillIds = new Set(
    selectedRole?.skills.map(({ skillId }) => skillId) ?? []
  );
  const availableSkills = dictionaries.skills.filter(
    (skill) =>
      !selectedSkillIds.has(skill.id) &&
      (skill.field_ids.length === 0 || skill.field_ids.includes(draft.fieldId))
  );

  const createRoleClientId = () => {
    const clientId = `local-role-${nextRoleClientId.current}`;
    nextRoleClientId.current += 1;
    return clientId;
  };

  const createSkillClientId = () => {
    const clientId = `local-skill-${nextSkillClientId.current}`;
    nextSkillClientId.current += 1;
    return clientId;
  };

  const addRole = (specializationId: string) => {
    const specialization = availableSpecializations.find(
      ({ id }) => id === Number(specializationId)
    );
    if (!specialization) return;

    const role: ProjectRoleDraft = {
      id: null,
      clientId: createRoleClientId(),
      specializationId: specialization.id,
      specializationName: specialization.name,
      tasks: [''],
      skills: [],
      benefits: [''],
    };

    setDraft((current) => ({
      ...current,
      roles: [...current.roles, role],
    }));
    setSelectedRoleClientId(role.clientId);
  };

  const updateRole = (updatedRole: ProjectRoleDraft) => {
    setDraft((current) => ({
      ...current,
      roles: current.roles.map((role) =>
        role.clientId === updatedRole.clientId ? updatedRole : role
      ),
    }));
    setValidationErrors((current) => {
      const roleErrors = { ...current.roleErrors };
      delete roleErrors[updatedRole.clientId];
      return { ...current, roles: undefined, roleErrors };
    });
    setSaveErrors([]);
    setSaveMessage(null);
  };

  const removeRole = (clientId: string) => {
    const remainingRoles = draft.roles.filter(
      (role) => role.clientId !== clientId
    );
    setDraft((current) => {
      const removedRole = current.roles.find(
        (role) => role.clientId === clientId
      );

      return {
        ...current,
        roles: current.roles.filter((role) => role.clientId !== clientId),
        deletedRoleIds:
          removedRole?.id === null || removedRole === undefined
            ? current.deletedRoleIds
            : [...new Set([...current.deletedRoleIds, removedRole.id])],
      };
    });

    if (selectedRoleClientId === clientId) {
      setSelectedRoleClientId(remainingRoles[0]?.clientId ?? null);
    }
    setValidationErrors((current) => {
      const roleErrors = { ...current.roleErrors };
      delete roleErrors[clientId];
      return { ...current, roles: undefined, roleErrors };
    });
    setSaveErrors([]);
    setSaveMessage(null);
  };

  const refreshServerState = async (currentDraft: EditProjectDraft) => {
    const freshProject = await projectService.getProjectDetail(
      currentDraft.projectId
    );
    const reconciledDraft = reconcileDraftWithServer(
      currentDraft,
      freshProject
    );
    setBaseline(freshProject);
    setDraft(reconciledDraft);
    setNeedsServerRefresh(false);
    queryClient.setQueryData(['project', currentDraft.projectId], freshProject);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['projects'] }),
      queryClient.invalidateQueries({ queryKey: ['userProjects'] }),
    ]);
    return { freshProject, reconciledDraft };
  };

  const handleSave = async () => {
    if (isSaving || isImageBusy) return;

    const errors = validateProjectDraft(draft);
    setValidationErrors(errors);
    setSaveErrors([]);
    setSaveMessage(null);

    if (hasValidationErrors(errors)) {
      const invalidRole = draft.roles.find(
        (role) => errors.roleErrors[role.clientId]
      );
      if (invalidRole) setSelectedRoleClientId(invalidRole.clientId);
      setSaveMessage('Исправьте отмеченные ошибки перед сохранением.');
      return;
    }

    setIsSaving(true);
    let workingDraft = draft;
    let workingBaseline = baseline;

    try {
      if (needsServerRefresh) {
        const refreshed = await refreshServerState(workingDraft);
        workingDraft = refreshed.reconciledDraft;
        workingBaseline = refreshed.freshProject;
      }

      if (!hasDraftChanges(workingDraft, workingBaseline)) {
        setSaveMessage('Изменений для сохранения нет.');
        return;
      }

      const result = await saveProjectDraft(
        workingDraft,
        workingBaseline,
        projectService,
        roleService
      );

      try {
        await refreshServerState(workingDraft);
      } catch {
        setNeedsServerRefresh(true);
        result.failures.push({
          operation: 'project',
          message:
            'Изменения отправлены, но не удалось получить актуальное состояние проекта. Перед повтором данные будут обновлены.',
        });
      }

      if (result.failures.length > 0) {
        setSaveErrors(result.failures.map(({ message }) => message));
        setSaveMessage(
          'Проект сохранён частично. Исправьте ошибки и повторите сохранение.'
        );
        const failedRole = result.failures.find(
          ({ roleClientId }) => roleClientId !== undefined
        );
        if (failedRole?.roleClientId) {
          setSelectedRoleClientId(failedRole.roleClientId);
        }
      } else {
        setValidationErrors({ roleErrors: {} });
        setSaveMessage('Изменения успешно сохранены.');
      }
    } catch (error) {
      setSaveErrors([
        error instanceof Error
          ? error.message
          : 'Не удалось сохранить изменения проекта.',
      ]);
      setSaveMessage('Сохранить проект не удалось. Черновик не потерян.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageSelect: React.ChangeEventHandler<HTMLInputElement> = async (
    event
  ) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file || isImageBusy || isSaving) return;

    setImageActionError(null);
    setIsImageUpdating(true);
    try {
      const result = await startUpload({
        kind: 'project_image',
        targetId: draft.projectId,
        file,
      });
      if (result?.status !== 'attached') return;

      await refreshServerState(draftRef.current);
      resetImageUpload();
    } catch (error: unknown) {
      setImageActionError(
        getActionErrorText(
          error,
          'Изображение загружено, но обновить данные проекта не удалось.'
        )
      );
    } finally {
      setIsImageUpdating(false);
    }
  };

  const handleImageDelete = async () => {
    if (isImageBusy || isSaving) return;

    setImageActionError(null);
    setIsImageDeleting(true);
    try {
      await projectService.deleteImage(draft.projectId);
      resetImageUpload();
      await refreshServerState(draftRef.current);
    } catch (error: unknown) {
      setImageActionError(
        getActionErrorText(error, 'Не удалось удалить изображение проекта.')
      );
    } finally {
      setIsImageDeleting(false);
    }
  };

  const showLocalPreview =
    previewUrl !== null &&
    imageStage !== 'failed' &&
    imageStage !== 'cancelled';
  const projectImageSrc = showLocalPreview ? previewUrl : baseline.image;
  const imageStatus = isImageDeleting
    ? 'Удаляем изображение…'
    : imageStageLabels[imageStage];
  const imageError = imageUploadError?.message ?? imageActionError;

  return (
    <main className={styles.page}>
      <Button
        variant="back"
        className={styles.backButton}
        onClick={() => navigate('/my-profile')}
      >
        В личный кабинет
      </Button>

      <div className={styles.content}>
        <h1 className={styles.visuallyHidden}>Редактирование проекта</h1>

        <section className={styles.topSection} aria-label="Основные данные">
          <div className={styles.projectCard}>
            <div className={styles.imageColumn} aria-busy={isImageBusy}>
              {projectImageSrc ? (
                <img
                  className={styles.projectImage}
                  src={projectImageSrc}
                  alt={`Изображение проекта «${draft.title}»`}
                />
              ) : (
                <div
                  className={styles.imagePlaceholder}
                  aria-label="Изображение проекта не загружено"
                  role="img"
                >
                  <span className={styles.placeholderHead} />
                  <span className={styles.placeholderBody} />
                </div>
              )}
              <p className={styles.imageState}>
                {showLocalPreview
                  ? 'Новое изображение'
                  : baseline.image
                    ? 'Текущее фото проекта'
                    : 'Фото проекта не добавлено'}
              </p>
              <input
                ref={imageInputRef}
                className={styles.imageInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={isImageBusy || isSaving}
                onChange={handleImageSelect}
                aria-label="Выбрать изображение проекта"
              />
              <Button
                variant="tertiary"
                className={styles.imageChooseButton}
                disabled={isImageBusy || isSaving}
                onClick={() => imageInputRef.current?.click()}
              >
                {baseline.image ? 'Заменить фото' : 'Добавить фото'}
              </Button>
              {isUploading ? (
                <button
                  type="button"
                  className={styles.imageActionButton}
                  onClick={cancelUpload}
                >
                  Отменить загрузку
                </button>
              ) : (
                baseline.image && (
                  <button
                    type="button"
                    className={styles.imageActionButton}
                    disabled={isImageBusy || isSaving}
                    onClick={() => void handleImageDelete()}
                  >
                    <Icon name="trashS" size={20} aria-hidden="true" />
                    Удалить фото
                  </button>
                )
              )}
              {imageStatus && (
                <p className={styles.imageOperationStatus} role="status">
                  {imageStatus}
                </p>
              )}
              {imageError && (
                <p className={styles.imageOperationError} role="alert">
                  {imageError}
                </p>
              )}
            </div>

            <div className={styles.mainFields}>
              <div className={styles.titleField}>
                <Input
                  id="project-title"
                  aria-label="Название проекта"
                  placeholder="Название проекта"
                  value={draft.title}
                  maxLength={PROJECT_TITLE_MAX_LENGTH}
                  errorText={validationErrors.title}
                  onChange={(event) => updateDraft('title', event.target.value)}
                />
              </div>

              <label
                className={styles.textareaField}
                htmlFor="project-description"
              >
                <span className={styles.visuallyHidden}>Суть проекта</span>
                <textarea
                  id="project-description"
                  value={draft.description}
                  maxLength={PROJECT_TEXT_MAX_LENGTH}
                  placeholder="Напиши здесь о сути проекта"
                  onChange={(event) =>
                    updateDraft('description', event.target.value)
                  }
                />
                <span className={styles.counter}>
                  {draft.description.length} / {PROJECT_TEXT_MAX_LENGTH}
                </span>
                {validationErrors.description && (
                  <span className={styles.fieldError} role="alert">
                    {validationErrors.description}
                  </span>
                )}
              </label>

              <label className={styles.textareaField} htmlFor="project-problem">
                <span className={styles.visuallyHidden}>Проблема проекта</span>
                <textarea
                  id="project-problem"
                  value={draft.problem}
                  maxLength={PROJECT_TEXT_MAX_LENGTH}
                  placeholder="Напиши здесь о проблеме вашего проекта"
                  onChange={(event) =>
                    updateDraft('problem', event.target.value)
                  }
                />
                <span className={styles.counter}>
                  {draft.problem.length} / {PROJECT_TEXT_MAX_LENGTH}
                </span>
                {validationErrors.problem && (
                  <span className={styles.fieldError} role="alert">
                    {validationErrors.problem}
                  </span>
                )}
              </label>
            </div>
          </div>

          <aside className={styles.settingsCard} aria-labelledby="roles-title">
            <img
              className={styles.rolesDecoration}
              src={searchDecoration}
              alt=""
              aria-hidden="true"
            />
            <div className={styles.settingsContent}>
              <h2 id="roles-title">Мы ищем</h2>

              <div
                className={styles.roleSelector}
                role="tablist"
                aria-label="Роли проекта"
              >
                {draft.roles.map((role) => (
                  <div className={styles.roleSelectorItem} key={role.clientId}>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={selectedRoleClientId === role.clientId}
                      className={
                        validationErrors.roleErrors[role.clientId]
                          ? styles.roleSelectorButtonError
                          : selectedRoleClientId === role.clientId
                            ? styles.roleSelectorButtonActive
                            : styles.roleSelectorButton
                      }
                      onClick={() => setSelectedRoleClientId(role.clientId)}
                    >
                      {role.specializationName || 'Новая роль'}
                    </button>
                    <button
                      type="button"
                      className={styles.removeRoleButton}
                      aria-label={`Удалить роль «${role.specializationName}»`}
                      onClick={() => removeRole(role.clientId)}
                    >
                      <Icon name="close" size={14} aria-hidden="true" />
                    </button>
                  </div>
                ))}
                {draft.roles.length === 0 && (
                  <p className={styles.emptyRoles}>
                    Добавьте хотя бы одну роль.
                  </p>
                )}
              </div>
              {validationErrors.roles && (
                <p className={styles.validationHint} role="alert">
                  {validationErrors.roles}
                </p>
              )}

              <div className={styles.addRoleSelect}>
                <Select
                  fullWidth
                  size="S"
                  labelText="Добавить роль"
                  options={availableSpecializations.map((specialization) => ({
                    value: String(specialization.id),
                    label: specialization.name,
                  }))}
                  value=""
                  disabled={availableSpecializations.length === 0}
                  onChange={addRole}
                />
              </div>

              <div className={styles.projectMetaControls}>
                <div className={styles.selectField}>
                  <label htmlFor="project-field">Область</label>
                  <Select
                    id="project-field"
                    fullWidth
                    size="S"
                    labelText="Область"
                    options={fieldOptions}
                    value={String(draft.fieldId)}
                    onChange={(value) => updateDraft('fieldId', Number(value))}
                  />
                  {validationErrors.fieldId && (
                    <p className={styles.validationHint} role="alert">
                      {validationErrors.fieldId}
                    </p>
                  )}
                </div>

                <div className={styles.selectField}>
                  <label htmlFor="project-status">Статус</label>
                  <Select
                    id="project-status"
                    fullWidth
                    size="S"
                    labelText="Статус"
                    options={statusOptions}
                    value={draft.status}
                    onChange={(value) =>
                      updateDraft('status', value as EditProjectDraft['status'])
                    }
                  />
                </div>
              </div>
            </div>
          </aside>
        </section>

        {selectedRole ? (
          <RoleEditor
            role={selectedRole}
            specializationOptions={selectedRoleSpecializations}
            availableSkills={availableSkills}
            createSkillClientId={createSkillClientId}
            onChange={updateRole}
            errors={validationErrors.roleErrors[selectedRole.clientId]}
          />
        ) : (
          <section className={styles.emptyRoleEditor}>
            <h2>Добавьте роль проекта</h2>
            <p>
              После выбора специализации здесь появятся задачи, навыки и
              преимущества роли.
            </p>
          </section>
        )}

        <section className={styles.saveSection} aria-live="polite">
          {saveMessage && (
            <p
              className={
                saveErrors.length > 0
                  ? styles.saveMessageError
                  : styles.saveMessage
              }
            >
              {saveMessage}
            </p>
          )}
          {saveErrors.length > 0 && (
            <ul className={styles.saveErrorList}>
              {saveErrors.map((message, index) => (
                <li key={`${message}-${index}`}>{message}</li>
              ))}
            </ul>
          )}
          <Button
            variant="secondary"
            className={styles.saveButton}
            disabled={isSaving || isImageBusy}
            onClick={() => void handleSave()}
          >
            {isSaving ? 'Сохраняем…' : 'Сохранить изменения'}
          </Button>
        </section>
      </div>
    </main>
  );
};

export const EditProjectPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api } = getServices();
  const projectId = Number(id);
  const hasProjectId = id !== undefined;
  const isValidProjectId =
    hasProjectId && Number.isInteger(projectId) && projectId > 0;

  const userService = useMemo(() => new UserService(api), [api]);
  const projectService = useMemo(() => new ProjectService(api), [api]);
  const roleService = useMemo(() => new ProjectRoleService(api), [api]);
  const fieldService = useMemo(() => new FieldService(api), [api]);
  const specializationService = useMemo(
    () => new SpecializationService(api),
    [api]
  );
  const skillService = useMemo(() => new SkillService(api), [api]);

  const currentUserQuery = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => userService.getCurrent(),
    enabled: isValidProjectId,
  });

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProjectDetail(projectId),
    enabled: isValidProjectId,
  });

  const currentUser = currentUserQuery.data;
  const project = projectQuery.data;
  const canEditProject =
    currentUser?.account_type === 'owner' &&
    project !== undefined &&
    project.owner_id === currentUser.id;

  const dictionariesQuery = useQuery<ProjectDictionaries>({
    queryKey: ['editProjectDictionaries'],
    queryFn: async () => {
      if (!project) {
        throw new Error('Данные проекта ещё не загружены.');
      }

      const [fields, specializations, skills] = await Promise.all([
        fieldService.list(),
        specializationService.list(),
        skillService.list(),
      ]);

      return { fields, specializations, skills };
    },
    enabled: canEditProject,
  });

  if (!hasProjectId) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard}>
          <h1>Создание проекта</h1>
          <p>Создание нового проекта будет реализовано на следующем этапе.</p>
          <Button onClick={() => navigate('/my-profile')}>
            Вернуться в личный кабинет
          </Button>
        </section>
      </main>
    );
  }

  if (!isValidProjectId) {
    return (
      <main className={styles.page}>
        <p className={styles.error} role="alert">
          Проект не найден: указан некорректный идентификатор.
        </p>
      </main>
    );
  }

  if (currentUserQuery.isPending || projectQuery.isPending) {
    return (
      <main className={styles.page}>
        <p className={styles.state} role="status">
          Загружаем проект…
        </p>
      </main>
    );
  }

  if (currentUserQuery.isError) {
    return (
      <main className={styles.page}>
        <p className={styles.error} role="alert">
          Не удалось проверить права пользователя. Попробуйте обновить страницу.
        </p>
      </main>
    );
  }

  if (projectQuery.isError) {
    return (
      <main className={styles.page}>
        <p className={styles.error} role="alert">
          {getProjectLoadError(projectQuery.error)}
        </p>
      </main>
    );
  }

  if (!currentUser || currentUser.account_type !== 'owner') {
    return (
      <main className={styles.page}>
        <p className={styles.error} role="alert">
          Редактировать проекты могут только пользователи с аккаунтом владельца.
        </p>
      </main>
    );
  }

  if (!project || project.owner_id !== currentUser.id) {
    return (
      <main className={styles.page}>
        <p className={styles.error} role="alert">
          У вас нет доступа к редактированию этого проекта.
        </p>
      </main>
    );
  }

  if (dictionariesQuery.isPending) {
    return (
      <main className={styles.page}>
        <p className={styles.state} role="status">
          Загружаем справочники…
        </p>
      </main>
    );
  }

  if (dictionariesQuery.isError) {
    return (
      <main className={styles.page}>
        <p className={styles.error} role="alert">
          Не удалось загрузить справочники для редактирования проекта.
        </p>
      </main>
    );
  }

  return (
    <EditProjectContent
      key={project.id}
      project={project}
      dictionaries={dictionariesQuery.data}
      projectService={projectService}
      roleService={roleService}
    />
  );
};
