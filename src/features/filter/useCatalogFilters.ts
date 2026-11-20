import { useMemo, useState, type SetStateAction } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

export interface CatalogFiltersValue {
  fieldIds: string[];
  specializationIds: string[];
  skillIds: string[];
}

const FILTER_PARAMS = {
  fieldIds: 'field_ids',
  specializationIds: 'specialization_ids',
  skillIds: 'skill_ids',
} as const;

const emptyFilters = (): CatalogFiltersValue => ({
  fieldIds: [],
  specializationIds: [],
  skillIds: [],
});

const parseIds = (params: URLSearchParams, key: string): string[] => {
  const ids = params
    .getAll(key)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter((value) => /^\d+$/.test(value) && Number(value) > 0);

  return Array.from(new Set(ids));
};

const parseFilters = (params: URLSearchParams): CatalogFiltersValue => ({
  fieldIds: parseIds(params, FILTER_PARAMS.fieldIds),
  specializationIds: parseIds(params, FILTER_PARAMS.specializationIds),
  skillIds: parseIds(params, FILTER_PARAMS.skillIds),
});

const setIds = (params: URLSearchParams, key: string, ids: string[]) => {
  if (ids.length === 0) {
    params.delete(key);
    return;
  }

  params.set(key, ids.join(','));
};

export const useCatalogFilters = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const serializedParams = searchParams.toString();
  const appliedFilters = useMemo(
    () => parseFilters(new URLSearchParams(serializedParams)),
    [serializedParams]
  );
  const passthroughParams = useMemo(() => {
    const params = new URLSearchParams(serializedParams);
    const search = params.get('search')?.trim() || undefined;
    const ordering = params.get('ordering')?.trim() || undefined;

    return { search, ordering };
  }, [serializedParams]);
  const appliedKey = [
    location.key,
    appliedFilters.fieldIds.join(','),
    appliedFilters.specializationIds.join(','),
    appliedFilters.skillIds.join(','),
  ].join('|');
  const [draftState, setDraftState] = useState({
    appliedKey,
    filters: appliedFilters,
  });
  const draftFilters =
    draftState.appliedKey === appliedKey
      ? draftState.filters
      : appliedFilters;
  const setDraftFilters = (value: SetStateAction<CatalogFiltersValue>) => {
    setDraftState({
      appliedKey,
      filters: typeof value === 'function' ? value(draftFilters) : value,
    });
  };

  const applyFilters = () => {
    const nextParams = new URLSearchParams(searchParams);
    setIds(nextParams, FILTER_PARAMS.fieldIds, draftFilters.fieldIds);
    setIds(
      nextParams,
      FILTER_PARAMS.specializationIds,
      draftFilters.specializationIds
    );
    setIds(nextParams, FILTER_PARAMS.skillIds, draftFilters.skillIds);
    setSearchParams(nextParams);
  };

  const resetFilters = () => {
    const filters = emptyFilters();
    const hasAppliedFilters = Object.values(appliedFilters).some(
      (ids) => ids.length > 0
    );
    if (!hasAppliedFilters) {
      setDraftState({ appliedKey, filters });
    }

    const nextParams = new URLSearchParams(searchParams);
    Object.values(FILTER_PARAMS).forEach((key) => nextParams.delete(key));
    setSearchParams(nextParams);
  };

  return {
    appliedFilters,
    draftFilters,
    setDraftFilters,
    applyFilters,
    resetFilters,
    serializedParams,
    passthroughParams,
  };
};
