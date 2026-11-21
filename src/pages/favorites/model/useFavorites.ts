import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getServices } from '@app';
import {
  FAVORITE_PROJECTS_QUERY_KEY,
  FavoriteProjectService,
  type FavoriteProject,
} from '@entities/favorite-project';
import { toProjectCardItems } from '@entities/project';
import { useCatalogFilterOptions } from '@features/filter';

// Данные страницы «Избранные проекты»: список избранного и удаление проекта.
export const useFavorites = () => {
  const { api } = getServices();
  const queryClient = useQueryClient();
  const favoriteService = useMemo(() => new FavoriteProjectService(api), [api]);
  // Цвета тегов ролей считаются по направлению проекта — как в каталоге.
  const { specializationColors } = useCatalogFilterOptions(api);

  const {
    data: favorites,
    isPending,
    isError,
  } = useQuery({
    queryKey: FAVORITE_PROJECTS_QUERY_KEY,
    queryFn: () => favoriteService.list(),
  });

  const removeFavorite = useMutation({
    mutationFn: (projectId: number) => favoriteService.delete(projectId),
    onMutate: async (projectId) => {
      await queryClient.cancelQueries({
        queryKey: FAVORITE_PROJECTS_QUERY_KEY,
      });

      const previousFavorites = queryClient.getQueryData<FavoriteProject[]>(
        FAVORITE_PROJECTS_QUERY_KEY
      );

      // Карточка исчезает сразу, не дожидаясь ответа сервера.
      queryClient.setQueryData<FavoriteProject[]>(
        FAVORITE_PROJECTS_QUERY_KEY,
        (currentFavorites) =>
          (currentFavorites ?? []).filter(
            (favorite) => favorite.project_id !== projectId
          )
      );

      return { previousFavorites };
    },
    onError: (_error, _projectId, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(
          FAVORITE_PROJECTS_QUERY_KEY,
          context.previousFavorites
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: FAVORITE_PROJECTS_QUERY_KEY,
      });
    },
  });

  const projects = useMemo(
    () =>
      toProjectCardItems(
        (favorites ?? []).map((favorite) => favorite.project),
        specializationColors
      ),
    [favorites, specializationColors]
  );

  return {
    projects,
    isPending,
    isError,
    removeFavorite: removeFavorite.mutate,
    removingProjectId: removeFavorite.isPending
      ? removeFavorite.variables
      : undefined,
    isRemoveError: removeFavorite.isError,
  };
};
