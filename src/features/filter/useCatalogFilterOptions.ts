import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FieldService } from '@entities/field/FieldService';
import { getProjectTagColor } from '@entities/project';
import { SkillService } from '@entities/skill/SkillService';
import { SpecializationService } from '@entities/specialization/SpecializationService';
import type { Api } from '@shared/api/api.class';
import type { FilterOption } from './Filter';

const toOptions = (items: Array<{ id: number; name: string }>): FilterOption[] =>
  items
    .map((item) => ({ value: String(item.id), label: item.name }))
    .sort((left, right) => left.label.localeCompare(right.label, 'ru'));

export const useCatalogFilterOptions = (api: Api) => {
  const fieldService = useMemo(() => new FieldService(api), [api]);
  const specializationService = useMemo(
    () => new SpecializationService(api),
    [api]
  );
  const skillService = useMemo(() => new SkillService(api), [api]);

  const fieldsQuery = useQuery({
    queryKey: ['fields'],
    queryFn: () => fieldService.list(),
  });
  const specializationsQuery = useQuery({
    queryKey: ['specializations'],
    queryFn: () => specializationService.list(),
  });
  const skillsQuery = useQuery({
    queryKey: ['skills'],
    queryFn: () => skillService.list({ ordering: 'name' }),
  });
  const specializationColors = useMemo(() => {
    const fieldNames = new Map(
      (fieldsQuery.data ?? []).map((field) => [field.id, field.name])
    );

    return new Map(
      (specializationsQuery.data ?? []).map((specialization) => [
        specialization.id,
        getProjectTagColor(fieldNames.get(specialization.field_id)),
      ])
    );
  }, [fieldsQuery.data, specializationsQuery.data]);

  return {
    fieldOptions: toOptions(fieldsQuery.data ?? []),
    specializationOptions: toOptions(specializationsQuery.data ?? []),
    specializationColors,
    skillOptions: toOptions(skillsQuery.data ?? []),
    isPending:
      fieldsQuery.isPending ||
      specializationsQuery.isPending ||
      skillsQuery.isPending,
    isError:
      fieldsQuery.isError ||
      specializationsQuery.isError ||
      skillsQuery.isError,
  };
};
