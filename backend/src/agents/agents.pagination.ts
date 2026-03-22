export interface PaginationQuery {
  limit?: number;
  offset?: number;
}

export interface PaginationBounds {
  defaultLimit: number;
  minLimit: number;
  maxLimit: number;
  minOffset: number;
  maxOffset: number;
}

export const DEFAULT_MIN_LIMIT = 1;
export const DEFAULT_MAX_LIMIT = 500;
export const DEFAULT_MIN_OFFSET = 0;
export const DEFAULT_MAX_OFFSET = 10_000;

export const PAGINATION_BOUNDS: PaginationBounds = {
  defaultLimit: 100,
  minLimit: DEFAULT_MIN_LIMIT,
  maxLimit: DEFAULT_MAX_LIMIT,
  minOffset: DEFAULT_MIN_OFFSET,
  maxOffset: DEFAULT_MAX_OFFSET,
};

export function normalizePagination(
  query: PaginationQuery,
  bounds: PaginationBounds,
): { limit: number; offset: number } {
  const limitRaw = query.limit;
  const offsetRaw = query.offset;
  const limit =
    typeof limitRaw === 'number' && Number.isFinite(limitRaw)
      ? Math.min(bounds.maxLimit, Math.max(bounds.minLimit, Math.trunc(limitRaw)))
      : bounds.defaultLimit;
  const offset =
    typeof offsetRaw === 'number' && Number.isFinite(offsetRaw)
      ? Math.min(bounds.maxOffset, Math.max(bounds.minOffset, Math.trunc(offsetRaw)))
      : bounds.minOffset;
  return { limit, offset };
}
