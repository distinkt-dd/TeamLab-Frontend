import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getServices } from '@app';
import { FieldService } from '@entities/field';
import { SpecializationCards } from '@entities/specialization';
import { useNavigate } from 'react-router-dom';
import styles from './Opportunities.module.css';
import { FindTeam } from './FindTeam';
import clouds from '../assets/clouds.png';

const HOME_DIRECTIONS = [
  { slug: 'design', name: 'Дизайн' },
  { slug: 'audio-music', name: 'Звук и музыка' },
  { slug: 'content', name: 'Контент' },
  { slug: 'marketing', name: 'Маркетинг и продвижение' },
  { slug: 'development', name: 'Разработка' },
  { slug: 'production', name: 'Съёмки и продакшн' },
  { slug: 'product', name: 'Продукт' },
] as const;

const ALL_DIRECTIONS_ID = 'all';

const normalizeFieldName = (name: string) =>
  name.trim().toLocaleLowerCase('ru-RU').replaceAll('ё', 'е');

const steps_data = [
  {
    title: 'Создай карточку проекта',
    text: 'Опиши идею, цель проекта и формат участия, чтобы участники понимали задачи и ожидания',
  },
  {
    title: 'Укажи, какие роли есть в проекте',
    text: 'Добавь нужные специализации, навыки\n и теги — это поможет найти подходящих участников',
  },
  {
    title: 'Получай отклики\n от участников',
    text: 'Просматривай профили участников, общайся и выбирай тех, кто лучше всего подходит',
  },
];

export const Opportunities: React.FC = () => {
  const navigate = useNavigate();
  const { api } = getServices();
  const fieldService = useMemo(() => new FieldService(api), [api]);
  const fieldsQuery = useQuery({
    queryKey: ['fields'],
    queryFn: () => fieldService.list(),
  });
  const fieldIdsBySlug = useMemo<Map<string, number>>(() => {
    const fieldsBySlug = new Map(
      (fieldsQuery.data ?? [])
        .filter((field) => field.slug)
        .map((field) => [field.slug as string, field])
    );
    const fieldsByName = new Map(
      (fieldsQuery.data ?? []).map((field) => [
        normalizeFieldName(field.name),
        field,
      ])
    );

    return new Map(
      HOME_DIRECTIONS.flatMap((direction) => {
        const field =
          fieldsBySlug.get(direction.slug) ??
          fieldsByName.get(normalizeFieldName(direction.name));

        return field ? [[direction.slug, field.id] as const] : [];
      })
    );
  }, [fieldsQuery.data]);
  const directionCards = [
    ...HOME_DIRECTIONS.map((direction) => ({
      id: direction.slug,
      name: direction.name,
      disabled:
        fieldsQuery.isPending || !fieldIdsBySlug.has(direction.slug),
    })),
    { id: ALL_DIRECTIONS_ID, name: 'Все профили', disabled: false },
  ];

  const handleDirectionSelect = (directionId: number | string) => {
    if (directionId === ALL_DIRECTIONS_ID) {
      navigate('/projects');
      return;
    }

    const fieldId = fieldIdsBySlug.get(String(directionId));
    if (!fieldId) return;

    const params = new URLSearchParams({ field_ids: String(fieldId) });
    navigate(`/projects?${params.toString()}`);
  };

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.titleContainer}>
          <h2 className={styles.title}>Открыт набор участников в проекты</h2>
          <span className={styles.signature}>
            Посмотрите проекты, где нужны специалисты вашего профиля
          </span>
        </div>
        <SpecializationCards
          data={directionCards}
          onSelect={handleDirectionSelect}
        />
      </div>
      <FindTeam data={steps_data} />
      <img src={clouds} className={styles.img} aria-hidden="true" />
    </section>
  );
};
