import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getServices } from '@app';
import { ProjectService, toProjectCardItems } from '@entities/project';
import type { ProjectStatus } from '@entities/project/types';
import {
  Filter,
  type FilterSelect,
  useCatalogFilterOptions,
  useCatalogFilters,
} from '@features/filter';
import { Button } from '@shared/ui/button';
import { ProjectsList } from '@widgets/projectsList';
import { getNextPageNumber } from '@shared/api/pagination';
import clsx from 'clsx';
import styles from './ProjectsPage.module.css';

const PAGE_SIZE = 3;

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { api } = getServices();
  const projectService = useMemo(() => new ProjectService(api), [api]);
  const [searchParams] = useSearchParams();
  const {
    appliedFilters,
    draftFilters,
    setDraftFilters,
    applyFilters,
    resetFilters,
    passthroughParams,
  } = useCatalogFilters();
  const {
    fieldOptions,
    specializationOptions,
    specializationColors,
    skillOptions,
    isPending: areOptionsPending,
    isError: areOptionsError,
  } = useCatalogFilterOptions(api);
  const statusParam = searchParams.get('status');
  const status: ProjectStatus | undefined =
    statusParam === 'open' || statusParam === 'closed'
      ? statusParam
      : undefined;
  const requestFilters = {
    field_ids: appliedFilters.fieldIds.join(',') || undefined,
    specialization_ids:
      appliedFilters.specializationIds.join(',') || undefined,
    skill_ids: appliedFilters.skillIds.join(',') || undefined,
    search: passthroughParams.search,
    ordering: passthroughParams.ordering,
    status,
  };

  const {
    data,
    isPending,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['projects', 'catalog', requestFilters],
    queryFn: ({ pageParam }) =>
      projectService.list({
        page: pageParam,
        limit: PAGE_SIZE,
        ...requestFilters,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => getNextPageNumber(lastPage.next),
  });

  const projects = useMemo(() => {
    const uniqueProjects = new Map(
      (data?.pages ?? [])
        .flatMap((page) => page.results)
        .map((project) => [project.id, project])
    );

    return toProjectCardItems(
      Array.from(uniqueProjects.values()),
      specializationColors
    );
  }, [data, specializationColors]);

  const filterSelects: FilterSelect[] = [
    {
      key: 'fields',
      multiple: true,
      options: fieldOptions,
      value: draftFilters.fieldIds,
      onChange: (fieldIds) =>
        setDraftFilters((filters) => ({ ...filters, fieldIds })),
      labelText: 'Все направления',
      disabled: areOptionsPending || fieldOptions.length === 0,
    },
    {
      key: 'specializations',
      multiple: true,
      variant: 'tags',
      options: specializationOptions,
      value: draftFilters.specializationIds,
      onChange: (specializationIds) =>
        setDraftFilters((filters) => ({ ...filters, specializationIds })),
      labelText: 'Специализации',
      disabled: areOptionsPending || specializationOptions.length === 0,
    },
    {
      key: 'skills',
      multiple: true,
      variant: 'tags',
      options: skillOptions,
      value: draftFilters.skillIds,
      onChange: (skillIds) =>
        setDraftFilters((filters) => ({ ...filters, skillIds })),
      labelText: 'Навыки',
      disabled: areOptionsPending || skillOptions.length === 0,
    },
  ];

  return (
    <>
      <div className={styles.decorations} aria-hidden="true">
        <img
          src="/violet-fuzz.png"
          alt=""
          className={clsx(styles.decorateImg, styles.vfPng)}
        />
        <img
          src="/magenta-deep.png"
          alt=""
          className={clsx(styles.decorateImg, styles.mdPng)}
        />
        <img
          src="/wavy-blue.png"
          alt=""
          className={clsx(styles.decorateImg, styles.wbPng)}
        />
      </div>
      <div className={styles.container}>
        <div className={styles.main}>
          <Button
            variant="back"
            className={styles.backButton}
            onClick={() => navigate('/')}
          >
            На главную
          </Button>
          <section className={styles.section}>
            <h2 className={styles.title}>Все проекты </h2>
            <Filter
              className={styles.filter}
              selects={filterSelects}
              onApply={applyFilters}
              onReset={resetFilters}
            />
            {areOptionsError && (
              <p className={styles.optionsError} role="alert">
                Не удалось загрузить справочники фильтров.
              </p>
            )}
            {isPending && <p className={styles.state}>Загружаем проекты...</p>}
            {isError && (
              <p className={styles.state} role="alert">
                Не удалось загрузить проекты. Попробуйте обновить страницу.
              </p>
            )}
            {!isPending && !isError && projects.length === 0 && (
              <p className={styles.state}>Проектов пока нет.</p>
            )}
            {!isPending && !isError && projects.length > 0 && (
              <ProjectsList data={projects} className={styles.projectsList} />
            )}
            {!isPending && !isError && hasNextPage && (
              <Button
                className={styles.button}
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? 'Загружаем...' : 'Показать еще'}
              </Button>
            )}
          </section>
        </div>
      </div>
    </>
  );
};
