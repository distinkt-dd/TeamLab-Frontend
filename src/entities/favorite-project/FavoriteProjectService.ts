import { Api } from '../../shared/api/api.class';
import { USERS_ME } from '../../shared/api/constants';
import type {
  FavoriteProject,
  FavoriteProjectCreateRequest,
  FavoriteProjectCreateResponse,
} from './types';

const FAVORITE_PROJECTS_PATH = `${USERS_ME}favorite-projects/`;

export class FavoriteProjectService {
  private readonly api: Api;

  constructor(api: Api) {
    this.api = api;
  }

  list(): Promise<FavoriteProject[]> {
    return this.api.get<FavoriteProject[]>(FAVORITE_PROJECTS_PATH);
  }

  create(
    data: FavoriteProjectCreateRequest
  ): Promise<FavoriteProjectCreateResponse> {
    return this.api.post<FavoriteProjectCreateResponse>(
      FAVORITE_PROJECTS_PATH,
      data
    );
  }

  delete(projectId: number): Promise<void> {
    const path = `${FAVORITE_PROJECTS_PATH}${projectId}/`;
    return this.api.delete<void>(path);
  }
}
