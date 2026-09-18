import { getServices, useAppSelector } from '@app';
import { FavoriteProjectService } from '@entities/favorite-project';
import { MembershipService } from '@entities/membership';
import { ProjectService } from '@entities/project';
import { RoleInterestService } from '@entities/role-interest';
import type {
  ProjectDetail,
  ProjectRole,
  RoleInterestSource,
  RoleInterestStatus,
} from '@entities/project/types';
import { selectAuthUser } from '@features/auth';
import { Icon } from '@shared/icons';
import { Button, Tag } from '@shared/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import tasksDecoration from './assets/Orange Notepad Dark Void-no-bg-preview (carve.photos) 1.png';
import benefitsDecoration from './assets/Red Fur Oblique View-no-bg-preview (carve.photos) 1.png';
import searchDecoration from './assets/Vibrant Gradient Cloud-no-bg-preview (carve.photos) 1.png';
import styles from './ProjectCardPage.module.css';

interface CtaState {
  label: string;
  canApply: boolean;
  hint: string | null;
}

const skillTagColors = ['pink', 'blue', 'green'] as const;

const formatPublishedDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  }).format(date);
};

const getErrorText = (error: unknown): string => {
  if (!(error instanceof Error)) return 'Не удалось выполнить запрос.';

  return error.message.replace(/^Request failed with status \d+:\s*/, '');
};

const getInterestLabel = (
  status: RoleInterestStatus,
  source: RoleInterestSource | null
): string => {
  if (status === 'pending') {
    return source === 'invitation'
      ? 'Вам отправлено приглашение'
      : 'Заявка отправлена';
  }

  if (status === 'accepted') {
    return source === 'invitation' ? 'Приглашение принято' : 'Заявка принята';
  }

  return source === 'invitation' ? 'Приглашение отклонено' : 'Заявка отклонена';
};

const hasActiveMembership = (project: ProjectDetail): boolean =>
  project.my_membership_status === 'active';

const getCtaState = (
  project: ProjectDetail,
  user: ReturnType<typeof selectAuthUser>,
  selectedRoleId: number | null
): CtaState => {
  if (!user) {
    return {
      label: 'Войдите, чтобы откликнуться',
      canApply: false,
      hint: null,
    };
  }

  if (project.owner_id === user.id) {
    return { label: 'Это ваш проект', canApply: false, hint: null };
  }

  if (user.account_type !== 'participant') {
    return {
      label: 'Только для соискателей',
      canApply: false,
      hint: null,
    };
  }

  if (selectedRoleId === null) {
    return {
      label: 'Нет доступных ролей',
      canApply: false,
      hint: 'В проекте пока нет ролей для отклика.',
    };
  }

  if (!project.matching_role_id) {
    return {
      label: 'Нет подходящей роли',
      canApply: false,
      hint: 'В проекте нет роли, соответствующей вашей специализации.',
    };
  }

  if (selectedRoleId !== project.matching_role_id) {
    const matchingRoleName = project.matching_role_name ?? 'подходящую роль';
    const existingRelation = project.my_membership_status
      ? 'Ваше участие'
      : project.my_interest_source === 'invitation'
        ? 'Ваше приглашение'
        : project.my_interest_status
          ? 'Ваш отклик'
          : null;

    return {
      label: 'Недоступно',
      canApply: false,
      hint: existingRelation
        ? `${existingRelation} относится к роли «${matchingRoleName}». Переключитесь на неё, чтобы увидеть актуальный статус.`
        : `Отклик доступен только на роль «${matchingRoleName}», которая соответствует вашей специализации.`,
    };
  }

  const matchingRoleName = project.matching_role_name ?? 'подходящая роль';
  const membershipHint = `Ваше участие относится к роли «${matchingRoleName}».`;
  const interestHint = `${
    project.my_interest_source === 'invitation'
      ? 'Ваше приглашение'
      : 'Ваш отклик'
  } относится к роли «${matchingRoleName}».`;

  if (hasActiveMembership(project)) {
    return {
      label: 'Вы уже в команде',
      canApply: false,
      hint: membershipHint,
    };
  }

  if (project.my_membership_status === 'left') {
    return {
      label: 'Вы покинули проект',
      canApply: false,
      hint: membershipHint,
    };
  }

  if (project.my_membership_status === 'removed') {
    return {
      label: 'Участие завершено',
      canApply: false,
      hint: membershipHint,
    };
  }

  if (project.my_interest_status) {
    return {
      label: getInterestLabel(
        project.my_interest_status,
        project.my_interest_source
      ),
      canApply: false,
      hint: interestHint,
    };
  }

  if (project.status === 'closed') {
    return {
      label: 'Набор закрыт',
      canApply: false,
      hint: `Выбрана подходящая роль «${matchingRoleName}».`,
    };
  }

  return {
    label: 'Хочу работать',
    canApply: true,
    hint: `Отклик будет отправлен на роль «${matchingRoleName}».`,
  };
};

const getInitialRoleId = (project: ProjectDetail): number | null => {
  if (
    project.matching_role_id &&
    project.roles.some((role) => role.id === project.matching_role_id)
  ) {
    return project.matching_role_id;
  }

  return project.roles[0]?.id ?? null;
};

export const ProjectCardPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useAppSelector(selectAuthUser);
  const projectId = Number(id);
  const isValidProjectId = Number.isInteger(projectId) && projectId > 0;
  const { api } = getServices();
  const projectService = useMemo(() => new ProjectService(api), [api]);
  const favoriteService = useMemo(() => new FavoriteProjectService(api), [api]);
  const membershipService = useMemo(() => new MembershipService(api), [api]);
  const roleInterestService = useMemo(
    () => new RoleInterestService(api),
    [api]
  );

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [isLeavingMembership, setIsLeavingMembership] = useState(false);
  const [isInvitationActionPending, setIsInvitationActionPending] =
    useState(false);
  const [isFavoritePending, setIsFavoritePending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    if (!isValidProjectId) {
      return undefined;
    }

    queueMicrotask(() => {
      if (isCancelled) return;
      setIsLoading(true);
      setLoadError(null);
    });

    projectService
      .getProjectDetail(projectId)
      .then((data) => {
        if (isCancelled) return;
        setProject(data);
        setSelectedRoleId(getInitialRoleId(data));
      })
      .catch((error: unknown) => {
        if (isCancelled) return;
        setProject(null);
        setLoadError(getErrorText(error));
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isValidProjectId, projectId, projectService, reloadKey]);

  const selectedRole = useMemo<ProjectRole | null>(() => {
    if (!project || selectedRoleId === null) return null;
    return project.roles.find((role) => role.id === selectedRoleId) ?? null;
  }, [project, selectedRoleId]);

  const orderedSkills = useMemo(
    () => [...(selectedRole?.skills ?? [])].sort((a, b) => a.order - b.order),
    [selectedRole]
  );

  const ctaState = project
    ? getCtaState(project, currentUser, selectedRoleId)
    : { label: 'Хочу работать', canApply: false, hint: null };

  const handleRoleSelect = (roleId: number) => {
    setSelectedRoleId(roleId);
    setActionError(null);
  };

  const handleApply = async () => {
    if (
      !project ||
      !ctaState.canApply ||
      selectedRoleId !== project.matching_role_id ||
      isApplying
    ) {
      return;
    }

    setIsApplying(true);
    setActionError(null);

    try {
      const application = await projectService.createProjectApplication(
        project.id
      );
      setSelectedRoleId(application.project_role_id);
      setProject((currentProject) =>
        currentProject
          ? {
              ...currentProject,
              matching_role_id: application.project_role_id,
              matching_role_name: application.project_role_name,
              my_interest_id: application.id,
              my_interest_status: application.status,
              my_interest_source: application.source,
            }
          : currentProject
      );
    } catch (error: unknown) {
      setActionError(getErrorText(error));
    } finally {
      setIsApplying(false);
    }
  };

  const handleFavoriteToggle = async () => {
    if (
      !project ||
      currentUser?.account_type !== 'participant' ||
      isFavoritePending
    ) {
      return;
    }

    setIsFavoritePending(true);
    setFavoriteError(null);

    try {
      if (project.is_favorited) {
        await favoriteService.delete(project.id);
      } else {
        await favoriteService.create({ project_id: project.id });
      }

      setProject((currentProject) =>
        currentProject
          ? {
              ...currentProject,
              is_favorited: !currentProject.is_favorited,
            }
          : currentProject
      );
    } catch (error: unknown) {
      setFavoriteError(getErrorText(error));
    } finally {
      setIsFavoritePending(false);
    }
  };

  const handleLeaveMembership = async () => {
    if (
      !project ||
      !hasActiveMembership(project) ||
      project.my_membership_id === null ||
      isLeavingMembership
    ) {
      return;
    }

    setIsLeavingMembership(true);
    setActionError(null);

    try {
      const membership = await membershipService.leave(
        project.my_membership_id
      );
      setProject((currentProject) =>
        currentProject
          ? {
              ...currentProject,
              my_membership_status: membership.status,
            }
          : currentProject
      );
    } catch (error: unknown) {
      setActionError(getErrorText(error));
    } finally {
      setIsLeavingMembership(false);
    }
  };

  const handleInvitationAction = async (action: 'accept' | 'reject') => {
    if (
      !project ||
      project.my_interest_id === null ||
      project.my_interest_source !== 'invitation' ||
      project.my_interest_status !== 'pending' ||
      isInvitationActionPending
    ) {
      return;
    }

    setIsInvitationActionPending(true);
    setActionError(null);

    try {
      const interest = await roleInterestService[action](
        project.my_interest_id
      );
      setSelectedRoleId(interest.project_role_id);
      setProject((currentProject) =>
        currentProject
          ? {
              ...currentProject,
              matching_role_id: interest.project_role_id,
              matching_role_name: interest.project_role_name,
              my_interest_id: interest.id,
              my_interest_status: interest.status,
              my_interest_source: interest.source,
              my_membership_id: interest.membership_id,
              my_membership_status: interest.membership_status,
            }
          : currentProject
      );
    } catch (error: unknown) {
      setActionError(getErrorText(error));
    } finally {
      setIsInvitationActionPending(false);
    }
  };

  if (!isValidProjectId) {
    return (
      <main className={styles.page}>
        <div className={`${styles.container} ${styles.errorState}`}>
          <h1 className={styles.errorTitle}>Проект не найден</h1>
          <p className={styles.errorText}>Некорректный адрес проекта.</p>
          <div className={styles.errorActions}>
            <Button variant="secondary" onClick={() => navigate('/projects')}>
              Все проекты
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className={styles.page} aria-busy="true">
        <div className={styles.container}>
          <p className={styles.loading}>Загружаем проект…</p>
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className={styles.page}>
        <div className={`${styles.container} ${styles.errorState}`}>
          <h1 className={styles.errorTitle}>Проект не найден</h1>
          <p className={styles.errorText}>{loadError}</p>
          <div className={styles.errorActions}>
            {isValidProjectId && (
              <Button onClick={() => setReloadKey((key) => key + 1)}>
                Попробовать снова
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate('/projects')}>
              Все проекты
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const publishedDate = formatPublishedDate(project.created_at);
  const isMatchingRoleSelected = selectedRoleId === project.matching_role_id;
  const isActiveTeamMember =
    isMatchingRoleSelected && hasActiveMembership(project);
  const hasPendingInvitation =
    !isActiveTeamMember &&
    isMatchingRoleSelected &&
    project.my_interest_source === 'invitation' &&
    project.my_interest_status === 'pending';

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <section className={styles.hero} aria-labelledby="project-title">
          <div className={styles.projectInfo}>
            <div className={styles.projectHeading}>
              <div className={styles.imageWrapper}>
                {project.image ? (
                  <img
                    className={styles.projectImage}
                    src={project.image}
                    alt=""
                  />
                ) : (
                  <span className={styles.imageFallback} aria-hidden="true">
                    {project.title.charAt(0)}
                  </span>
                )}
                <span
                  className={`${styles.statusBadge} ${
                    project.status === 'closed' ? styles.closedBadge : ''
                  }`}
                >
                  {project.status === 'open' ? 'Идет набор' : 'Набор закрыт'}
                </span>
              </div>

              <div className={styles.titleWrapper}>
                <h1 id="project-title" className={styles.title}>
                  {project.title}
                </h1>
                {publishedDate && (
                  <p className={styles.published}>
                    Опубликовано {publishedDate}
                  </p>
                )}
              </div>
            </div>

            <div className={styles.descriptionBlocks}>
              <div>
                <h2 className={styles.sectionSubtitle}>Суть проекта</h2>
                <p className={styles.copy}>{project.description}</p>
              </div>
              {project.problem && (
                <div>
                  <h2 className={styles.sectionSubtitle}>Проблема</h2>
                  <p className={styles.copy}>{project.problem}</p>
                </div>
              )}
            </div>
          </div>

          <div className={styles.searchCardWrapper}>
            <img
              src={searchDecoration}
              className={`${styles.decorativeFuzz} ${styles.searchDecoration}`}
              alt=""
              aria-hidden="true"
            />

            <aside
              className={`${styles.searchCard} ${
                hasPendingInvitation ? styles.searchCardInvitation : ''
              }`}
            >
              <button
                type="button"
                className={`${styles.favoriteButton} ${
                  project.is_favorited ? styles.favoriteButtonActive : ''
                }`}
                onClick={handleFavoriteToggle}
                disabled={
                  isFavoritePending ||
                  currentUser?.account_type !== 'participant'
                }
                aria-pressed={project.is_favorited}
                aria-label={
                  project.is_favorited
                    ? 'Удалить проект из избранного'
                    : 'Добавить проект в избранное'
                }
              >
                <Icon name="like" size={44} />
              </button>

              <div className={styles.searchCardContent}>
                <h2
                  className={`${styles.searchTitle} ${
                    isActiveTeamMember ? styles.searchTitleMember : ''
                  }`}
                >
                  {isActiveTeamMember ? 'Вы в команде' : 'Мы ищем'}
                </h2>
                {project.roles.length > 0 ? (
                  <div
                    className={styles.roleList}
                    role="tablist"
                    aria-label="Роли проекта"
                  >
                    {project.roles.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        role="tab"
                        aria-selected={selectedRoleId === role.id}
                        className={`${styles.roleListButton} ${
                          selectedRoleId === role.id
                            ? styles.roleListButtonActive
                            : ''
                        }`}
                        onClick={() => handleRoleSelect(role.id)}
                      >
                        <span className={styles.roleName}>
                          {role.specialization_name ?? 'Роль без названия'}
                        </span>
                        {project.matching_role_id === role.id && (
                          <span className={styles.matchingRoleLabel}>
                            Вам подходит
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyText}>Роли пока не опубликованы</p>
                )}

                {isActiveTeamMember ? (
                  <Button
                    variant="tertiary"
                    className={styles.leaveMembershipButton}
                    onClick={handleLeaveMembership}
                    disabled={
                      isLeavingMembership || project.my_membership_id === null
                    }
                  >
                    Прекратить участие
                  </Button>
                ) : hasPendingInvitation ? (
                  <div className={styles.invitationActions}>
                    <Button
                      variant="secondary"
                      className={styles.acceptInvitationButton}
                      onClick={() => handleInvitationAction('accept')}
                      disabled={
                        isInvitationActionPending ||
                        project.my_interest_id === null
                      }
                    >
                      Принять приглашение
                    </Button>
                    <Button
                      className={styles.rejectInvitationButton}
                      onClick={() => handleInvitationAction('reject')}
                      disabled={
                        isInvitationActionPending ||
                        project.my_interest_id === null
                      }
                    >
                      Отклонить
                    </Button>
                  </div>
                ) : (
                  <Button
                    className={styles.applyButton}
                    onClick={handleApply}
                    disabled={!ctaState.canApply || isApplying}
                    aria-describedby={
                      ctaState.hint ? 'project-application-hint' : undefined
                    }
                  >
                    {isApplying ? 'Отправляем…' : ctaState.label}
                  </Button>
                )}
                <div className={styles.actionMessages}>
                  {ctaState.hint && (
                    <p
                      id="project-application-hint"
                      className={styles.matchingRoleHint}
                    >
                      {ctaState.hint}
                    </p>
                  )}
                  {actionError && (
                    <p className={styles.actionError} role="alert">
                      {actionError}
                    </p>
                  )}
                  {favoriteError && (
                    <p className={styles.actionError} role="alert">
                      {favoriteError}
                    </p>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </section>

        {project.roles.length > 0 && (
          <section className={styles.roleContent}>
            <div
              className={styles.roleTabs}
              role="tablist"
              aria-label="Описание ролей"
            >
              {project.roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedRoleId === role.id}
                  className={`${styles.roleTab} ${
                    selectedRoleId === role.id ? styles.roleTabActive : ''
                  } ${
                    project.matching_role_id === role.id
                      ? styles.roleTabMatching
                      : ''
                  }`}
                  onClick={() => handleRoleSelect(role.id)}
                >
                  <span>{role.specialization_name ?? 'Роль без названия'}</span>
                  {project.matching_role_id === role.id && (
                    <span className={styles.roleTabMatchLabel}>Ваша роль</span>
                  )}
                </button>
              ))}
            </div>

            {selectedRole && (
              <div role="tabpanel" className={styles.rolePanel}>
                <section className={styles.tasksSection}>
                  <div className={styles.tasksDecoration} aria-hidden="true">
                    <img src={tasksDecoration} alt="" />
                  </div>
                  <div className={styles.tasksList}>
                    <h2 className={styles.visuallyHidden}>Задачи</h2>
                    {selectedRole.tasks.length > 0 ? (
                      <ul className={styles.lineList}>
                        {selectedRole.tasks.map((task, index) => (
                          <li key={`${task}-${index}`}>{task}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.emptyText}>Задачи пока не описаны</p>
                    )}
                  </div>
                </section>

                <section className={styles.skillsSection}>
                  <div className={styles.skillsHeading}>
                    <h2 className={styles.blockTitle}>Ключевые навыки</h2>
                    <div className={styles.skillTags}>
                      {orderedSkills.map((skill, index) => (
                        <Tag
                          key={skill.id}
                          className={styles.skillTag}
                          bgColor={
                            skillTagColors[index % skillTagColors.length]
                          }
                        >
                          {skill.name}
                        </Tag>
                      ))}
                    </div>
                  </div>

                  {orderedSkills.length > 0 ? (
                    <ol className={styles.skillRequirements}>
                      {orderedSkills.map((skill) => (
                        <li key={skill.id}>
                          <span className={styles.skillOrder}>
                            {skill.order}
                          </span>
                          <span>{skill.description}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className={styles.emptyText}>Навыки пока не указаны</p>
                  )}
                </section>

                <section className={styles.benefitsSection}>
                  <div className={styles.benefitsDecoration} aria-hidden="true">
                    <img src={benefitsDecoration} alt="" />
                  </div>
                  <div className={styles.benefitsCard}>
                    <h2 className={styles.blockTitle}>Что получите</h2>
                    {selectedRole.benefits.length > 0 ? (
                      <ul
                        className={`${styles.lineList} ${styles.benefitsList}`}
                      >
                        {selectedRole.benefits.map((benefit, index) => (
                          <li key={`${benefit}-${index}`}>{benefit}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.emptyText}>
                        Преимущества пока не описаны
                      </p>
                    )}
                  </div>
                </section>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
};
