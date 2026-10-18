import { Api } from '../../shared/api/api.class';
import type {
  ProjectCreateRequest,
  ProjectDetail,
  ProjectUpdateRequest,
  GetProjectsParams,
  CurrentUserApplicationCard,
  ProjectInvitationCard,
  ProjectApplicationCard,
  ProjectInvitationCreateRequest,
  PaginationParams,
  PaginatedProjects,
} from './types';
import { PROJECTS } from '../../shared/api/constants';
import type { PaginatedResponse } from '@shared/api/types';
import { collectPaginatedResults } from '@shared/api/pagination';

export class ProjectService {
  private readonly api: Api;

  constructor(api: Api) {
    this.api = api;
  }

  list(params?: GetProjectsParams): Promise<PaginatedProjects> {
    return this.api.get<PaginatedProjects>(PROJECTS, params);
  }

  createProject(data: ProjectCreateRequest): Promise<ProjectDetail> {
    return this.api.post<ProjectDetail>(PROJECTS, data);
  }

  getFeaturedProjects(params?: PaginationParams): Promise<PaginatedProjects> {
    return this.api.get<PaginatedProjects>(`${PROJECTS}featured/`, params);
  }

  getProjectDetail(projectId: number): Promise<ProjectDetail> {
    return this.api.get<ProjectDetail>(`${PROJECTS}${projectId}/`);
  }

  updateProject(
    projectId: number,
    data: ProjectUpdateRequest
  ): Promise<ProjectDetail> {
    return this.api.patch<ProjectDetail>(`${PROJECTS}${projectId}/`, data);
  }

  getProjectApplications(
    projectId: number,
    params?: PaginationParams
  ): Promise<PaginatedResponse<ProjectApplicationCard>> {
    return this.api.get<PaginatedResponse<ProjectApplicationCard>>(
      `${PROJECTS}${projectId}/applications/`,
      params
    );
  }

  getAllProjectApplications(
    projectId: number
  ): Promise<ProjectApplicationCard[]> {
    return collectPaginatedResults((page) =>
      this.getProjectApplications(projectId, { page })
    );
  }

  createProjectApplication(
    projectId: number
  ): Promise<CurrentUserApplicationCard> {
    return this.api.post<CurrentUserApplicationCard>(
      `${PROJECTS}${projectId}/applications/`
    );
  }

  getProjectInvitations(
    projectId: number,
    params?: PaginationParams
  ): Promise<PaginatedResponse<ProjectInvitationCard>> {
    return this.api.get<PaginatedResponse<ProjectInvitationCard>>(
      `${PROJECTS}${projectId}/invitations/`,
      params
    );
  }

  createProjectInvitation(
    projectId: number,
    data: ProjectInvitationCreateRequest
  ): Promise<ProjectInvitationCard> {
    return this.api.post<ProjectInvitationCard>(
      `${PROJECTS}${projectId}/invitations/`,
      data
    );
  }
}
