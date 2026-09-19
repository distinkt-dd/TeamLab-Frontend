import { Api } from '../../shared/api/api.class';
import type {
  UserPublic,
  CurrentUser,
  PaginatedUsers,
  UserCreateRequest,
  UserUpdateRequest,
  AvatarUpdateRequest,
  AvatarResponse,
  SetPasswordRequest,
  ListUsersParams,
  CurrentUserProjects,
  CurrentUserNotification,
} from './types';
import { USERS, USERS_ME } from '../../shared/api/constants';

const MY_PROJECTS_PATH = `${USERS_ME}projects/`;
const NOTIFICATIONS_PATH = `${USERS_ME}notifications/`;

export class UserService {
  private readonly api: Api;

  constructor(api: Api) {
    this.api = api;
  }

  list(params?: ListUsersParams): Promise<PaginatedUsers> {
    return this.api.get<PaginatedUsers>(USERS, params);
  }

  create(data: UserCreateRequest): Promise<CurrentUser> {
    return this.api.post<CurrentUser>(USERS, data);
  }

  retrieve(userId: number): Promise<UserPublic> {
    return this.api.get<UserPublic>(`${USERS}${userId}/`);
  }

  getCurrent(): Promise<CurrentUser> {
    return this.api.get<CurrentUser>(USERS_ME);
  }

  updateCurrent(data: UserUpdateRequest): Promise<CurrentUser> {
    return this.api.patch<CurrentUser>(USERS_ME, data);
  }

  // Проекты текущего пользователя и приглашения, ожидающие ответа.
  getMyProjects(): Promise<CurrentUserProjects> {
    return this.api.get<CurrentUserProjects>(MY_PROJECTS_PATH);
  }

  // Уведомления текущего пользователя: у владельца — pending-отклики на его проекты,
  // у участника — pending-приглашения. Только чтение.
  getNotifications(): Promise<CurrentUserNotification[]> {
    return this.api.get<CurrentUserNotification[]>(NOTIFICATIONS_PATH);
  }

  uploadAvatar(data: AvatarUpdateRequest): Promise<AvatarResponse> {
    return this.api.put<AvatarResponse>(`${USERS_ME}avatar/`, data);
  }

  deleteAvatar(): Promise<void> {
    return this.api.delete<void>(`${USERS_ME}avatar/`);
  }

  setPassword(data: SetPasswordRequest): Promise<void> {
    return this.api.post<void>(`${USERS}set_password/`, data);
  }
}
