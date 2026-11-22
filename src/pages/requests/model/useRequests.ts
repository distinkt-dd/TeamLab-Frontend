import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getServices } from '@app';
import { ProjectService } from '@entities/project';
import type { ProjectApplicationCard } from '@entities/project/types';
import {
  CURRENT_USER_QUERY_KEY,
  UserService,
  ownerRequestsQueryKey,
} from '@entities/user';
import { useCatalogFilterOptions } from '@features/filter';

export interface ApplicationItem extends ProjectApplicationCard {
  project_id: number;
  project_title: string;
}

const REQUESTS_ERROR_FALLBACK = 'Не удалось загрузить заявки.';

// Данные страницы «Заявки»: входящие заявки в проекты владельца
// и справочники для фильтров (из общего кэша TanStack Query).
export const useRequests = () => {
  const { api } = getServices();
  const userService = useMemo(() => new UserService(api), [api]);
  const projectService = useMemo(() => new ProjectService(api), [api]);

  // Текущий пользователь: тот же ключ, что и на остальных страницах.
  const {
    data: user,
    isPending: isUserPending,
    isError: isUserError,
  } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => userService.getCurrent(),
  });

  const {
    fieldOptions,
    skillOptions,
    specializationFieldIdById,
    isPending: areDictionariesPending,
    isError: areDictionariesError,
  } = useCatalogFilterOptions(api);

  const isOwner = user?.account_type === 'owner';

  // Заявки собираются по всем проектам владельца: детали проекта нужны
  // ради названия, а сами заявки приходят отдельным списком.
  const {
    data: applications,
    isPending: areApplicationsPending,
    isError: areApplicationsError,
    error: applicationsError,
  } = useQuery({
    queryKey: ownerRequestsQueryKey(user?.id ?? 0),
    enabled: isOwner,
    retry: false,
    queryFn: async (): Promise<ApplicationItem[]> => {
      if (!user) return [];

      const applicationGroups = await Promise.all(
        user.owned_project_ids.map(async (projectId) => {
          const [project, projectApplications] = await Promise.all([
            projectService.getProjectDetail(projectId),
            projectService.getAllProjectApplications(projectId),
          ]);

          return projectApplications.map((application) => ({
            ...application,
            project_id: project.id,
            project_title: project.title,
          }));
        })
      );

      return applicationGroups
        .flat()
        .sort(
          (left, right) =>
            new Date(right.created_at).getTime() -
            new Date(left.created_at).getTime()
        );
    },
  });

  const error =
    isUserError || areDictionariesError
      ? REQUESTS_ERROR_FALLBACK
      : areApplicationsError
        ? applicationsError instanceof Error
          ? applicationsError.message
          : REQUESTS_ERROR_FALLBACK
        : null;

  return {
    applications: applications ?? [],
    isPending:
      isUserPending ||
      areDictionariesPending ||
      (isOwner && areApplicationsPending),
    error,
    fieldOptions,
    skillOptions,
    specializationFieldIdById,
    baseUrl: api.baseUrl,
  };
};
