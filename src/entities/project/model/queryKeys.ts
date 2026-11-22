// Ключ детали проекта. Карточка проекта, редактирование и инвалидации
// должны сходиться на одном ключе, иначе кэш расходится между экранами.
export const projectDetailQueryKey = (projectId: number) =>
  ['project', projectId] as const;
