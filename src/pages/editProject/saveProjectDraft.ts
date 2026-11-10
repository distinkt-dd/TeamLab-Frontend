import type {
  ProjectDetail,
  ProjectRole,
  ProjectRoleSkillInput,
  ProjectUpdateRequest,
} from '@entities/project/types';
import type {
  ProjectRoleCreateRequest,
  ProjectRoleUpdateRequest,
} from '@entities/project-role/types';
import type { EditProjectDraft, ProjectRoleDraft } from './model';

const PROJECT_TITLE_MAX_LENGTH = 255;
const PROJECT_TEXT_MAX_LENGTH = 500;

export interface RoleValidationErrors {
  specialization?: string;
  tasks?: string;
  skills?: string;
  benefits?: string;
}

export interface DraftValidationErrors {
  title?: string;
  description?: string;
  problem?: string;
  fieldId?: string;
  roles?: string;
  roleErrors: Record<string, RoleValidationErrors>;
}

export interface SaveFailure {
  operation: 'project' | 'create' | 'update' | 'delete' | 'conflict';
  roleClientId?: string;
  roleName?: string;
  message: string;
}

interface ProjectWriter {
  updateProject(
    projectId: number,
    data: ProjectUpdateRequest
  ): Promise<ProjectDetail>;
}

interface ProjectRoleWriter {
  create(data: ProjectRoleCreateRequest): Promise<ProjectRole>;
  update(roleId: number, data: ProjectRoleUpdateRequest): Promise<ProjectRole>;
  delete(roleId: number): Promise<void>;
}

export interface SaveDraftResult {
  attempted: boolean;
  failures: SaveFailure[];
}

const hasValues = (items: string[]) =>
  items.length > 0 && items.every((item) => item.trim().length > 0);

export const validateProjectDraft = (
  draft: EditProjectDraft
): DraftValidationErrors => {
  const errors: DraftValidationErrors = { roleErrors: {} };

  if (!draft.title.trim()) {
    errors.title = 'Укажите название проекта.';
  } else if (draft.title.length > PROJECT_TITLE_MAX_LENGTH) {
    errors.title = `Название не должно превышать ${PROJECT_TITLE_MAX_LENGTH} символов.`;
  }

  if (!draft.description.trim()) {
    errors.description = 'Заполните описание проекта.';
  } else if (draft.description.length > PROJECT_TEXT_MAX_LENGTH) {
    errors.description = `Описание не должно превышать ${PROJECT_TEXT_MAX_LENGTH} символов.`;
  }

  if (draft.problem.length > PROJECT_TEXT_MAX_LENGTH) {
    errors.problem = `Описание проблемы не должно превышать ${PROJECT_TEXT_MAX_LENGTH} символов.`;
  }

  if (!Number.isInteger(draft.fieldId) || draft.fieldId <= 0) {
    errors.fieldId = 'Выберите область проекта.';
  }

  if (draft.roles.length === 0) {
    errors.roles = 'Добавьте хотя бы одну роль.';
  }

  const specializationCounts = new Map<number, number>();
  draft.roles.forEach((role) => {
    specializationCounts.set(
      role.specializationId,
      (specializationCounts.get(role.specializationId) ?? 0) + 1
    );
  });

  draft.roles.forEach((role) => {
    const roleErrors: RoleValidationErrors = {};
    if (
      !Number.isInteger(role.specializationId) ||
      role.specializationId <= 0
    ) {
      roleErrors.specialization = 'Выберите специализацию.';
    } else if ((specializationCounts.get(role.specializationId) ?? 0) > 1) {
      roleErrors.specialization = 'Специализации ролей не должны повторяться.';
    }

    if (!hasValues(role.tasks)) {
      roleErrors.tasks = 'Добавьте хотя бы одну заполненную задачу.';
    }

    if (!hasValues(role.benefits)) {
      roleErrors.benefits = 'Добавьте хотя бы одно заполненное преимущество.';
    }

    const skillIds = role.skills.map(({ skillId }) => skillId);
    const orders = role.skills.map(({ order }) => order);
    if (role.skills.length === 0) {
      roleErrors.skills = 'Добавьте хотя бы один навык.';
    } else if (
      role.skills.some(
        ({ skillId, description, order }) =>
          !Number.isInteger(skillId) ||
          skillId <= 0 ||
          !description.trim() ||
          !Number.isInteger(order) ||
          order < 1
      )
    ) {
      roleErrors.skills = 'Заполните описания и порядок всех навыков.';
    } else if (
      new Set(skillIds).size !== skillIds.length ||
      new Set(orders).size !== orders.length
    ) {
      roleErrors.skills =
        'Навыки и их порядковые номера не должны повторяться.';
    }

    if (Object.keys(roleErrors).length > 0) {
      errors.roleErrors[role.clientId] = roleErrors;
    }
  });

  if (Object.keys(errors.roleErrors).length > 0 && !errors.roles) {
    errors.roles = 'Исправьте ошибки в ролях проекта.';
  }

  return errors;
};

export const hasValidationErrors = (errors: DraftValidationErrors) =>
  Object.keys(errors).some(
    (key) => key !== 'roleErrors' || Object.keys(errors.roleErrors).length > 0
  );

const toSkillInputs = (role: ProjectRoleDraft): ProjectRoleSkillInput[] =>
  [...role.skills]
    .sort((first, second) => first.order - second.order)
    .map(({ skillId, description, order }) => ({
      skill_id: skillId,
      description: description.trim(),
      order,
    }));

const normalizedStrings = (items: string[]) => items.map((item) => item.trim());

const roleInput = (role: ProjectRoleDraft): ProjectRoleUpdateRequest => ({
  specialization_id: role.specializationId,
  tasks: normalizedStrings(role.tasks),
  benefits: normalizedStrings(role.benefits),
  skills: toSkillInputs(role),
});

const sameStrings = (first: string[], second: string[]) =>
  first.length === second.length &&
  first.every((item, index) => item.trim() === second[index]?.trim());

const sameSkills = (role: ProjectRoleDraft, serverRole: ProjectRole) => {
  const draftSkills = toSkillInputs(role);
  const serverSkills = [...serverRole.skills]
    .sort((first, second) => first.order - second.order)
    .map(({ skill_id, description, order }) => ({
      skill_id,
      description,
      order,
    }));

  return JSON.stringify(draftSkills) === JSON.stringify(serverSkills);
};

export const getRoleChanges = (
  role: ProjectRoleDraft,
  serverRole: ProjectRole
): ProjectRoleUpdateRequest => {
  const changes: ProjectRoleUpdateRequest = {};
  if (role.specializationId !== serverRole.specialization_id) {
    changes.specialization_id = role.specializationId;
  }
  if (!sameStrings(role.tasks, serverRole.tasks)) {
    changes.tasks = normalizedStrings(role.tasks);
  }
  if (!sameStrings(role.benefits, serverRole.benefits)) {
    changes.benefits = normalizedStrings(role.benefits);
  }
  if (!sameSkills(role, serverRole)) changes.skills = toSkillInputs(role);
  return changes;
};

const roleChanged = (role: ProjectRoleDraft, serverRole: ProjectRole) =>
  Object.keys(getRoleChanges(role, serverRole)).length > 0;

export const getProjectChanges = (
  draft: EditProjectDraft,
  baseline: ProjectDetail
): ProjectUpdateRequest => {
  const changes: ProjectUpdateRequest = {};
  if (draft.fieldId !== baseline.field_id) changes.field_id = draft.fieldId;
  if (draft.title.trim() !== baseline.title) changes.title = draft.title.trim();
  if (draft.description.trim() !== baseline.description) {
    changes.description = draft.description.trim();
  }
  if (draft.problem.trim() !== (baseline.problem ?? '')) {
    changes.problem = draft.problem.trim() || null;
  }
  if (draft.status !== baseline.status) changes.status = draft.status;
  return changes;
};

export const hasDraftChanges = (
  draft: EditProjectDraft,
  baseline: ProjectDetail
) => {
  if (Object.keys(getProjectChanges(draft, baseline)).length > 0) return true;
  if (
    draft.deletedRoleIds.some((id) =>
      baseline.roles.some((role) => role.id === id)
    )
  ) {
    return true;
  }

  return draft.roles.some((role) => {
    if (role.id === null) return true;
    const serverRole = baseline.roles.find(({ id }) => id === role.id);
    return serverRole === undefined || roleChanged(role, serverRole);
  });
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Неизвестная ошибка API.';

export const saveProjectDraft = async (
  draft: EditProjectDraft,
  baseline: ProjectDetail,
  projectService: ProjectWriter,
  roleService: ProjectRoleWriter
): Promise<SaveDraftResult> => {
  const failures: SaveFailure[] = [];
  const projectChanges = getProjectChanges(draft, baseline);
  const baselineRoles = new Map(baseline.roles.map((role) => [role.id, role]));
  const deletedIds = new Set(
    draft.deletedRoleIds.filter((id) => baselineRoles.has(id))
  );
  const changedRoles = draft.roles.filter((role) => {
    if (role.id === null) return false;
    const serverRole = baselineRoles.get(role.id);
    return serverRole === undefined || roleChanged(role, serverRole);
  });
  const newRoles = draft.roles.filter((role) => role.id === null);
  const attempted =
    Object.keys(projectChanges).length > 0 ||
    deletedIds.size > 0 ||
    changedRoles.length > 0 ||
    newRoles.length > 0;

  if (!attempted) return { attempted: false, failures };

  if (Object.keys(projectChanges).length > 0) {
    try {
      await projectService.updateProject(draft.projectId, projectChanges);
    } catch (error) {
      failures.push({
        operation: 'project',
        message: `Основные данные проекта: ${errorMessage(error)}`,
      });
      return { attempted: true, failures };
    }
  }

  const occupied = new Map(
    baseline.roles.map((role) => [role.specialization_id, role.id])
  );
  let pendingUpdates = [...changedRoles];

  const runAvailableUpdates = async () => {
    let progressed = true;
    while (progressed && pendingUpdates.length > 0) {
      progressed = false;
      const nextPending: ProjectRoleDraft[] = [];

      for (const role of pendingUpdates) {
        if (role.id === null) continue;
        const serverRole = baselineRoles.get(role.id);
        const occupant = occupied.get(role.specializationId);
        if (occupant !== undefined && occupant !== role.id) {
          nextPending.push(role);
          continue;
        }

        try {
          await roleService.update(
            role.id,
            serverRole ? getRoleChanges(role, serverRole) : roleInput(role)
          );
          if (serverRole) occupied.delete(serverRole.specialization_id);
          occupied.set(role.specializationId, role.id);
        } catch (error) {
          failures.push({
            operation: 'update',
            roleClientId: role.clientId,
            roleName: role.specializationName,
            message: `Роль «${role.specializationName}»: ${errorMessage(error)}`,
          });
        }
        progressed = true;
      }

      pendingUpdates = nextPending;
    }
  };

  await runAvailableUpdates();

  for (const roleId of deletedIds) {
    const serverRole = baselineRoles.get(roleId);
    try {
      await roleService.delete(roleId);
      if (serverRole) occupied.delete(serverRole.specialization_id);
    } catch (error) {
      failures.push({
        operation: 'delete',
        roleName: serverRole?.specialization_name ?? `#${roleId}`,
        message: `Удаление роли «${serverRole?.specialization_name ?? roleId}»: ${errorMessage(error)}`,
      });
    }
  }

  await runAvailableUpdates();

  pendingUpdates.forEach((role) => {
    failures.push({
      operation: 'conflict',
      roleClientId: role.clientId,
      roleName: role.specializationName,
      message: `Роль «${role.specializationName}» не сохранена: выбранная специализация занята другой ролью.`,
    });
  });

  for (const role of newRoles) {
    if (occupied.has(role.specializationId)) {
      failures.push({
        operation: 'conflict',
        roleClientId: role.clientId,
        roleName: role.specializationName,
        message: `Роль «${role.specializationName}» не создана: специализация уже занята.`,
      });
      continue;
    }

    try {
      const created = await roleService.create({
        project_id: draft.projectId,
        ...roleInput(role),
      } as ProjectRoleCreateRequest);
      occupied.set(role.specializationId, created.id);
    } catch (error) {
      failures.push({
        operation: 'create',
        roleClientId: role.clientId,
        roleName: role.specializationName,
        message: `Создание роли «${role.specializationName}»: ${errorMessage(error)}`,
      });
    }
  }

  return { attempted: true, failures };
};

export const reconcileDraftWithServer = (
  draft: EditProjectDraft,
  server: ProjectDetail
): EditProjectDraft => {
  const serverById = new Map(server.roles.map((role) => [role.id, role]));
  const claimedIds = new Set<number>();

  const roles = draft.roles.map((role) => {
    let serverRole = role.id === null ? undefined : serverById.get(role.id);
    if (!serverRole) {
      serverRole = server.roles.find(
        (candidate) =>
          candidate.specialization_id === role.specializationId &&
          !claimedIds.has(candidate.id)
      );
    }
    if (!serverRole) return { ...role, id: null };

    claimedIds.add(serverRole.id);
    return {
      ...role,
      id: serverRole.id,
      skills: role.skills.map((skill) => ({
        ...skill,
        id:
          serverRole?.skills.find(
            (serverSkill) => serverSkill.skill_id === skill.skillId
          )?.id ?? null,
      })),
    };
  });

  return {
    ...draft,
    roles,
    deletedRoleIds: draft.deletedRoleIds.filter((id) => serverById.has(id)),
  };
};
