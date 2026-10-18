import type { PaginatedResponse } from './types';

export const getNextPageNumber = (next: string | null): number | null => {
  if (!next) return null;

  try {
    const page = Number(
      new URL(next, 'http://localhost').searchParams.get('page')
    );
    return Number.isInteger(page) && page > 0 ? page : null;
  } catch {
    return null;
  }
};

export const collectPaginatedResults = async <T extends { id: number }>(
  fetchPage: (page: number) => Promise<PaginatedResponse<T>>
): Promise<T[]> => {
  const items = new Map<number, T>();
  const visitedPages = new Set<number>();
  let page: number | null = 1;

  while (page !== null && !visitedPages.has(page)) {
    visitedPages.add(page);
    const response = await fetchPage(page);
    response.results.forEach((item) => items.set(item.id, item));
    page = getNextPageNumber(response.next);
  }

  return Array.from(items.values());
};
