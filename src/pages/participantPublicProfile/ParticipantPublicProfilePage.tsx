import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getServices, useAppSelector } from '@app';
import { ProjectService } from '@entities/project';
import type {
  ProjectApplicationCard,
  ProjectInvitationCard,
} from '@entities/project/types';
import { MembershipService } from '@entities/membership';
import { RoleInterestService } from '@entities/role-interest';
import {
  EmploymentTypeMapped,
  SkillLevelMapped,
  UserLevelMapped,
} from '@entities/user/mapped';
import {
  CURRENT_USER_QUERY_KEY,
  UserService,
  ownerPendingInvitationsQueryKey,
} from '@entities/user';
import type {
  SearchStatus,
  SkillLevel,
  SocialLinks,
  WorkFormat,
} from '@entities/user/types';
import { selectAuthUser, selectIsAuthenticated } from '@features/auth';
import { Icon } from '@shared/icons';
import { Button, Tag } from '@shared/ui';
import { useParams } from 'react-router-dom';
import styles from './ParticipantPublicProfilePage.module.css';
import defaultAvatar from '../editProfile/assets/logo.svg';

const skillLevelOrder: SkillLevel[] = ['advanced', 'middle', 'basic'];

type ProjectRelation =
  | { kind: 'application'; interest: ProjectApplicationCard }
  | { kind: 'invitation'; interest: ProjectInvitationCard }
  | { kind: 'membership'; membershipId: number }
  | { kind: 'closed'; label: string }
  | { kind: 'none' };

const searchStatusLabels: Record<SearchStatus, string> = {
  looking_for_team: 'Ищу команду',
  looking_for_members: 'Ищу участников',
  not_looking: 'Не ищу',
};
const workFormatLabels: Record<WorkFormat, string> = {
  remote: 'Удалённо',
  hybrid: 'Гибрид',
};

const socialLinkLabels: Record<keyof SocialLinks, string> = {
  telegram: 'Telegram',
  github: 'GitHub',
  vk: 'VK',
  behance: 'Behance',
  instagram: 'Instagram',
};

const getErrorText = (error: unknown, fallback: string) => {
  if (!(error instanceof Error)) return fallback;
  return error.message.replace(/^Request failed with status \d+:\s*/, '');
};

const getErrorStatus = (error: unknown) => {
  if (!(error instanceof Error)) return null;
  return Number(error.message.match(/status (\d+)/)?.[1]) || null;
};

const getContactHref = (value: string) => {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
};

const ProfileState = ({
  children,
  isError = false,
}: {
  children: React.ReactNode;
  isError?: boolean;
}) => (
  <main className={styles.statePage}>
    <p className={styles.state} role={isError ? 'alert' : undefined}>
      {children}
    </p>
  </main>
);

export const ParticipantPublicProfilePage: React.FC = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const authUser = useAppSelector(selectAuthUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const participantId = Number(id);
  const isValidId = Number.isInteger(participantId) && participantId > 0;
  const { api } = getServices();
  const userService = useMemo(() => new UserService(api), [api]);
  const projectService = useMemo(() => new ProjectService(api), [api]);
  const roleInterestService = useMemo(
    () => new RoleInterestService(api),
    [api]
  );
  const membershipService = useMemo(() => new MembershipService(api), [api]);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [isBioOverflowing, setIsBioOverflowing] = useState(false);
  const bioRef = useRef<HTMLDivElement>(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [invitationStatus, setInvitationStatus] = useState<string | null>(null);
  const [relationOverrides, setRelationOverrides] = useState<
    Record<number, ProjectRelation>
  >({});

  const profileQueryKey = ['participant', 'public-profile', participantId];
  const {
    data: participant,
    isPending,
    error: participantError,
  } = useQuery({
    queryKey: profileQueryKey,
    queryFn: () => userService.retrieve(participantId),
    enabled: isValidId,
    retry: false,
  });

  const { data: currentUser, isError: isCurrentUserError } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => userService.getCurrent(),
    enabled: isAuthenticated && authUser?.account_type === 'owner',
  });

  const ownedProjectIds = currentUser?.owned_project_ids ?? [];
  const {
    data: ownedProjects,
    isPending: areProjectsPending,
    isError: areProjectsError,
  } = useQuery({
    queryKey: ['participant-invite-projects', ownedProjectIds],
    queryFn: () =>
      Promise.all(
        ownedProjectIds.map((projectId) =>
          projectService.getProjectDetail(projectId)
        )
      ),
    enabled:
      currentUser?.account_type === 'owner' && ownedProjectIds.length > 0,
  });

  const eligibleProjects = (() => {
    if (!participant?.specialization_id) return [];
    return (ownedProjects ?? []).filter((project) =>
      project.roles.some(
        (role) => role.specialization_id === participant.specialization_id
      )
    );
  })();

  const effectiveProjectId =
    selectedProjectId ||
    (eligibleProjects.length === 1 ? String(eligibleProjects[0]?.id) : '');

  const selectedProject = eligibleProjects.find(
    (project) => project.id === Number(effectiveProjectId)
  );
  const relationQueryKey = [
    'participant-project-relation',
    participantId,
    selectedProject?.id,
  ];
  const {
    data: pendingRelations,
    isPending: isRelationPending,
    isError: isRelationError,
  } = useQuery({
    queryKey: relationQueryKey,
    queryFn: async () => {
      if (!selectedProject) return { application: null, invitation: null };
      const [applications, invitations] = await Promise.all([
        projectService.getAllProjectApplications(selectedProject.id),
        projectService.getAllProjectInvitations(selectedProject.id),
      ]);
      return {
        application:
          applications.find((item) => item.user.id === participantId) ?? null,
        invitation:
          invitations.find((item) => item.user_id === participantId) ?? null,
      };
    },
    enabled: currentUser?.account_type === 'owner' && Boolean(selectedProject),
  });

  const contextualRoleIds = new Set(
    selectedProject?.roles.map((role) => role.id) ?? []
  );
  const hasContextualMembership = Boolean(
    selectedProject &&
    participant?.project_membership_id &&
    participant.project_membership_status === 'active' &&
    participant.matching_project_role_id &&
    contextualRoleIds.has(participant.matching_project_role_id)
  );
  const hasContextualClosedInterest = Boolean(
    selectedProject &&
    participant?.project_interest_id &&
    participant.project_interest_status &&
    participant.project_interest_status !== 'pending' &&
    participant.matching_project_role_id &&
    contextualRoleIds.has(participant.matching_project_role_id)
  );
  const serverRelation: ProjectRelation = hasContextualMembership
    ? {
        kind: 'membership',
        membershipId: participant?.project_membership_id as number,
      }
    : pendingRelations?.application
      ? { kind: 'application', interest: pendingRelations.application }
      : pendingRelations?.invitation
        ? { kind: 'invitation', interest: pendingRelations.invitation }
        : hasContextualClosedInterest
          ? {
              kind: 'closed',
              label:
                participant?.project_membership_status === 'removed'
                  ? 'Участие завершено'
                  : participant?.project_interest_status === 'rejected'
                    ? 'Заявка отклонена'
                    : 'Заявка обработана',
            }
          : { kind: 'none' };
  const projectRelation = selectedProject
    ? (relationOverrides[selectedProject.id] ?? serverRelation)
    : ({ kind: 'none' } satisfies ProjectRelation);

  const invitationMutation = useMutation({
    mutationFn: (projectId: number) =>
      projectService.createProjectInvitation(projectId, {
        user_id: participantId,
      }),
    onSuccess: async (invitation, projectId) => {
      setInvitationStatus('Приглашение отправлено.');
      setRelationOverrides((current) => ({
        ...current,
        [projectId]: { kind: 'invitation', interest: invitation },
      }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileQueryKey }),
        queryClient.invalidateQueries({
          queryKey: ['participant-project-relation', participantId, projectId],
        }),
        queryClient.invalidateQueries({
          queryKey: ownerPendingInvitationsQueryKey(authUser?.id ?? 0),
        }),
      ]);
    },
    onError: (error) => {
      setInvitationStatus(
        getErrorText(error, 'Не удалось отправить приглашение.')
      );
    },
  });

  const interestMutation = useMutation({
    mutationFn: ({
      action,
      interestId,
    }: {
      action: 'accept' | 'reject';
      interestId: number;
    }) => roleInterestService[action](interestId),
    onSuccess: async (result, variables) => {
      setInvitationStatus(
        variables.action === 'accept' ? 'Заявка принята.' : 'Заявка отклонена.'
      );
      setRelationOverrides((current) => ({
        ...current,
        [result.project_id]:
          variables.action === 'accept' && result.membership_id
            ? { kind: 'membership', membershipId: result.membership_id }
            : { kind: 'closed', label: 'Заявка отклонена' },
      }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileQueryKey }),
        queryClient.invalidateQueries({
          queryKey: [
            'participant-project-relation',
            participantId,
            result.project_id,
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: ['currentUserNotifications'],
        }),
      ]);
    },
    onError: (error) => {
      setInvitationStatus(getErrorText(error, 'Не удалось обработать заявку.'));
    },
  });

  const membershipMutation = useMutation({
    mutationFn: (membershipId: number) =>
      membershipService.remove(membershipId),
    onSuccess: async (membership) => {
      setInvitationStatus('Участник исключён из команды.');
      setRelationOverrides((current) => ({
        ...current,
        [membership.project_id]: { kind: 'closed', label: 'Участие завершено' },
      }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['userProjects'] }),
      ]);
    },
    onError: (error) => {
      setInvitationStatus(
        getErrorText(error, 'Не удалось исключить участника.')
      );
    },
  });

  useEffect(() => {
    const element = bioRef.current;
    if (!element || isContentExpanded) {
      setIsBioOverflowing(false);
      return;
    }
    const checkOverflow = () => {
      setIsBioOverflowing(element.scrollHeight > element.clientHeight + 1);
    };
    checkOverflow();
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(element);
    return () => observer.disconnect();
  }, [isContentExpanded, participant]);

  if (!isValidId) {
    return (
      <ProfileState isError>Некорректный идентификатор участника.</ProfileState>
    );
  }

  if (isPending) {
    return <ProfileState>Загружаем профиль участника…</ProfileState>;
  }

  if (participantError) {
    const status = getErrorStatus(participantError);
    const text =
      status === 404
        ? 'Участник не найден.'
        : status === 403
          ? 'У вас нет доступа к этому профилю.'
          : 'Не удалось загрузить профиль. Попробуйте обновить страницу.';
    return <ProfileState isError>{text}</ProfileState>;
  }

  if (!participant) return null;

  const bio =
    participant.bio?.trim() || 'Участник пока ничего не рассказал о себе.';
  const skillGroups = skillLevelOrder.map((level) => ({
    level,
    skills: participant.skills.filter((skill) => skill.level === level),
  }));
  const socialLinks = Object.entries(participant.social_links ?? {}).filter(
    (entry): entry is [keyof SocialLinks, string] => Boolean(entry[1])
  );
  const isOwner = authUser?.account_type === 'owner';

  const showContacts = isOwner
    ? projectRelation.kind === 'membership' && participant.contacts_visible
    : participant.contacts_visible;
  const inviteDisabled =
    invitationMutation.isPending ||
    interestMutation.isPending ||
    membershipMutation.isPending ||
    !effectiveProjectId ||
    selectedProject?.status !== 'open' ||
    projectRelation.kind !== 'none';

  const handleInvite = () => {
    const projectId = Number(effectiveProjectId);
    if (!projectId || invitationMutation.isPending) return;
    setInvitationStatus(null);
    invitationMutation.mutate(projectId);
  };

  const handleInterest = (action: 'accept' | 'reject') => {
    if (projectRelation.kind !== 'application' || interestMutation.isPending) {
      return;
    }
    setInvitationStatus(null);
    interestMutation.mutate({
      action,
      interestId: projectRelation.interest.id,
    });
  };

  const handleRemove = () => {
    if (projectRelation.kind !== 'membership' || membershipMutation.isPending) {
      return;
    }
    if (!window.confirm('Исключить участника из команды?')) return;
    setInvitationStatus(null);
    membershipMutation.mutate(projectRelation.membershipId);
  };

  return (
    <main className={styles.page}>
      <div className={styles.heroBg} aria-hidden="true" />
      <div className={styles.container}>
        <section className={styles.heroSection}>
          <article className={styles.aboutCard}>
            <div className={styles.identity}>
              <div className={styles.avatarWrapper}>
                <img
                  className={styles.avatar}
                  src={participant.avatar ?? defaultAvatar}
                  alt={`Аватар ${participant.display_name}`}
                />
                <Tag bgColor="blue" className={styles.searchStatusTag}>
                  {participant.search_status
                    ? searchStatusLabels[participant.search_status]
                    : 'Статус не указан'}
                </Tag>
              </div>
              <h1 className={styles.specialization}>
                {participant.specialization_name ?? 'Специализация не указана'}
              </h1>
            </div>

            <div
              ref={bioRef}
              className={`${styles.bio} ${
                isContentExpanded ? '' : styles.bioCollapsed
              }`}
            >
              {bio}
            </div>

            {!isContentExpanded && (
              <div
                className={`${styles.showAll} ${
                  isBioOverflowing ? styles.showAllFaded : ''
                }`}
              >
                <Button
                  className={styles.showAllButton}
                  variant="secondary"
                  aria-expanded={isContentExpanded}
                  onClick={() => setIsContentExpanded(true)}
                >
                  Показать полностью
                </Button>
              </div>
            )}
          </article>

          <aside className={styles.summaryCard}>
            {/* <h2 className={styles.contactsTitle}>Контакты</h2> */}
            <h2 className={styles.displayName}>{participant.display_name}</h2>
            <div className={styles.profileTags}>
              {participant.city && (
                <Tag bgColor="turquoise">{participant.city}</Tag>
              )}
              {participant.workload_hours_per_week && (
                <Tag bgColor="pink">
                  {participant.workload_hours_per_week} ч/нед
                </Tag>
              )}
              {participant.level && (
                <Tag bgColor="green">{UserLevelMapped[participant.level]}</Tag>
              )}
              {participant.employment_type && (
                <Tag bgColor="purple">
                  {EmploymentTypeMapped[participant.employment_type]}
                </Tag>
              )}
              {participant.work_format && (
                <Tag bgColor="yellow">
                  {workFormatLabels[participant.work_format]}
                </Tag>
              )}
            </div>

            <div className={styles.contacts}>
              {showContacts && socialLinks.length > 0 ? (
                <ul className={styles.contactList}>
                  {socialLinks.map(([key, value]) => (
                    <li key={key}>
                      <a
                        className={styles.contactLink}
                        href={getContactHref(value)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className={styles.contactLabel}>
                          {socialLinkLabels[key]}
                        </span>
                        <span className={styles.contactValue}>{value}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : showContacts ? (
                <p>Участник не указал контакты.</p>
              ) : (
                <p className={styles.contactsPlaceholder}>
                  Здесь появятся контакты после метча
                </p>
              )}
            </div>

            {isOwner ? (
              <div className={styles.inviteBlock}>
                {areProjectsPending ? (
                  <p>Загружаем ваши проекты…</p>
                ) : isCurrentUserError || areProjectsError ? (
                  <p role="alert">
                    Не удалось загрузить проекты для приглашения.
                  </p>
                ) : eligibleProjects.length > 0 ? (
                  <>
                    {/* Выбор нужен только когда подходящих проектов больше одного */}
                    {eligibleProjects.length > 1 && (
                      <>
                        <label htmlFor="invite-project">Проект</label>
                        <select
                          id="invite-project"
                          className={styles.projectSelect}
                          value={effectiveProjectId}
                          disabled={invitationMutation.isPending}
                          onChange={(event) => {
                            setSelectedProjectId(event.target.value);
                            setInvitationStatus(null);
                          }}
                        >
                          <option value="">Выберите проект</option>
                          {eligibleProjects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.title}
                              {project.status === 'closed' ? ' — закрыт' : ''}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                    {selectedProject && isRelationPending ? (
                      <p>Проверяем состояние участника…</p>
                    ) : isRelationError ? (
                      <p role="alert">
                        Не удалось проверить заявки и приглашения.
                      </p>
                    ) : projectRelation.kind === 'application' ? (
                      <div className={styles.relationActions}>
                        <Button
                          className={styles.invitationButton}
                          variant="secondary"
                          disabled={interestMutation.isPending}
                          onClick={() => handleInterest('accept')}
                        >
                          {interestMutation.isPending
                            ? 'Обрабатываем…'
                            : 'Принять заявку'}
                        </Button>
                        <Button
                          className={styles.invitationButton}
                          disabled={interestMutation.isPending}
                          onClick={() => handleInterest('reject')}
                        >
                          Отклонить
                        </Button>
                      </div>
                    ) : projectRelation.kind === 'invitation' ? (
                      <Button className={styles.invitationButton} disabled>
                        Приглашение отправлено
                      </Button>
                    ) : projectRelation.kind === 'membership' ? (
                      <div className={styles.membershipBlock}>
                        <p>
                          {participant.display_name} в вашей команде
                          <Icon
                            name="check"
                            size={24}
                            className={styles.membershipCheck}
                            aria-hidden="true"
                          />
                        </p>
                        <Button
                          className={styles.removeButton}
                          variant="tertiary"
                          disabled={membershipMutation.isPending}
                          onClick={handleRemove}
                        >
                          {membershipMutation.isPending
                            ? 'Исключаем…'
                            : 'Исключить'}
                        </Button>
                      </div>
                    ) : projectRelation.kind === 'closed' ? (
                      <Button className={styles.invitationButton} disabled>
                        {projectRelation.label}
                      </Button>
                    ) : (
                      <Button
                        className={styles.invitationButton}
                        variant={
                          selectedProject?.status === 'closed'
                            ? 'primary'
                            : 'secondary'
                        }
                        disabled={inviteDisabled}
                        onClick={handleInvite}
                      >
                        {invitationMutation.isPending
                          ? 'Отправляем…'
                          : selectedProject?.status === 'closed'
                            ? 'Проект закрыт'
                            : 'Пригласить в команду'}
                      </Button>
                    )}
                  </>
                ) : (
                  <p>
                    Нет открытого проекта с ролью «
                    {participant.specialization_name ??
                      'специализация не указана'}
                    ».
                  </p>
                )}
                {invitationStatus && (
                  <p
                    className={styles.invitationStatus}
                    role={invitationMutation.isError ? 'alert' : 'status'}
                  >
                    {invitationStatus}
                  </p>
                )}
              </div>
            ) : (
              <p className={styles.inviteHint}>
                Приглашения доступны владельцам проектов.
              </p>
            )}
          </aside>
        </section>

        {isContentExpanded && (
          <>
            <section className={styles.skillsSection}>
              <h2 className={styles.sectionTitle}>Мои навыки</h2>
              <div className={styles.skillsLayout}>
                <div className={styles.skillsDecoration} aria-hidden="true" />
                <div className={styles.skillsGroups}>
                  {participant.skills.length > 0 ? (
                    skillGroups.map(({ level, skills }) => (
                      <div className={styles.skillGroup} key={level}>
                        <p className={styles.skillLevel}>
                          {SkillLevelMapped[level]}
                        </p>
                        {skills.length > 0 ? (
                          <ul className={styles.skillList}>
                            {skills.map((skill) => (
                              <li key={skill.skill_id}>{skill.name}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className={styles.emptyLevel}>Навыки не указаны</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className={styles.emptySection}>
                      Участник пока не указал навыки.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className={styles.worksSection}>
              <h2 className={styles.sectionTitle}>Мои работы</h2>
              {participant.portfolio_works.length > 0 ? (
                <ul className={styles.worksGrid}>
                  {participant.portfolio_works.map((work) => (
                    <li className={styles.workCard} key={work.id}>
                      {work.image ? (
                        <img
                          className={styles.workImage}
                          src={work.image}
                          alt={`Изображение работы ${work.title}`}
                        />
                      ) : (
                        <div
                          className={`${styles.workImage} ${styles.workImagePlaceholder}`}
                          role="img"
                          aria-label="Изображение работы не добавлено"
                        />
                      )}
                      <div className={styles.workContent}>
                        <h3>{work.title}</h3>
                        {work.task && (
                          <div>
                            <span className={styles.workLabel}>Задача</span>
                            <p>{work.task}</p>
                          </div>
                        )}
                        {work.solution && (
                          <div>
                            <span className={styles.workLabel}>Решение</span>
                            <p>{work.solution}</p>
                          </div>
                        )}
                        {work.technologies && work.technologies.length > 0 && (
                          <div className={styles.technologies}>
                            {work.technologies.map((technology) => (
                              <Tag key={technology}>{technology}</Tag>
                            ))}
                          </div>
                        )}
                        {work.link && (
                          <a
                            className={styles.workLink}
                            href={work.link}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Узнать больше ↗
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.emptySection}>
                  Участник пока не добавил работы.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
};
