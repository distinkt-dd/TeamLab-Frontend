import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getServices } from '@app';
import { UserService } from '@entities/user';
import {
  Filter,
  type FilterSelect,
  useCatalogFilterOptions,
  useCatalogFilters,
} from '@features/filter';
import { getNextPageNumber } from '@shared/api/pagination';
import { Button } from '@shared/ui';
import { ParticipantsList } from '@widgets/participantsList';
import clsx from 'clsx';
import styles from './ParticipantsPage.module.css';

const PAGE_SIZE = 6;

export const ParticipantsPage: React.FC = () => {
  const navigate = useNavigate();
  const { api } = getServices();
  const userService = useMemo(() => new UserService(api), [api]);
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
    skillOptions,
    isPending: areOptionsPending,
    isError: areOptionsError,
  } = useCatalogFilterOptions(api);
  const requestFilters = {
    account_type: 'participant' as const,
    field_ids: appliedFilters.fieldIds.join(',') || undefined,
    specialization_ids:
      appliedFilters.specializationIds.join(',') || undefined,
    skill_ids: appliedFilters.skillIds.join(',') || undefined,
    search: passthroughParams.search,
    ordering: passthroughParams.ordering,
  };

  const {
    data,
    isPending,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['participants', 'catalog', requestFilters],
    queryFn: ({ pageParam }) =>
      userService.list({
        page: pageParam,
        limit: PAGE_SIZE,
        ...requestFilters,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => getNextPageNumber(lastPage.next),
  });

  const participants = useMemo(
    () =>
      Array.from(
        new Map(
          (data?.pages ?? [])
            .flatMap((page) => page.results)
            .map((participant) => [participant.id, participant])
        ).values()
      ),
    [data]
  );

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
        <section className={styles.section}>
          <Button
            className={styles.buttonBack}
            type="button"
            variant="back"
            onClick={() => navigate('/')}
          >
            На главную
          </Button>
          <h2 className={styles.title}>Все участники</h2>
          <Filter
            selects={filterSelects}
            onApply={applyFilters}
            onReset={resetFilters}
          />
          {areOptionsError && (
            <p className={styles.optionsError} role="alert">
              Не удалось загрузить справочники фильтров.
            </p>
          )}
          {isPending && (
            <p className={styles.state}>Загружаем участников...</p>
          )}
          {isError && (
            <p className={styles.state} role="alert">
              Не удалось загрузить участников. Попробуйте обновить страницу.
            </p>
          )}
          {!isPending && !isError && participants.length === 0 && (
            <p className={styles.state}>Участников пока нет.</p>
          )}
          {!isPending && !isError && participants.length > 0 && (
            <ParticipantsList users={participants} />
          )}
          {!isPending && !isError && hasNextPage && (
            <Button
              type="button"
              className={styles.buttonMore}
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? 'Загружаем...' : 'Показать еще'}
            </Button>
          )}
        </section>
      </div>
    </>
  );
};
