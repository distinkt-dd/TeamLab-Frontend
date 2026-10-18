import { Api } from '../../shared/api/api.class';
import { PROJECTS_ROLES } from '../../shared/api/constants';
import type {
  ProjectRole,
  ProjectRoleCreateRequest,
  ProjectRoleUpdateRequest,
} from './types';

export class ProjectRoleService {
  private readonly api: Api;

  constructor(api: Api) {
    this.api = api;
  }

  list(params?: {
    project_id?: number;
    specialization_id?: number;
  }): Promise<ProjectRole[]> {
    return this.api.get<ProjectRole[]>(PROJECTS_ROLES, params);
  }

  create(data: ProjectRoleCreateRequest): Promise<ProjectRole> {
    return this.api.post<ProjectRole>(PROJECTS_ROLES, data);
  }

  get(roleId: number): Promise<ProjectRole> {
    return this.api.get<ProjectRole>(`${PROJECTS_ROLES}${roleId}/`);
  }

  update(roleId: number, data: ProjectRoleUpdateRequest): Promise<ProjectRole> {
    return this.api.patch<ProjectRole>(`${PROJECTS_ROLES}${roleId}/`, data);
  }

  delete(roleId: number): Promise<void> {
    return this.api.delete<void>(`${PROJECTS_ROLES}${roleId}/`);
  }
}
