import type { PaginatedItemsResponse } from '../types/agents';
import type { PaginationBounds, PaginationQuery } from '../types/pagination';
import { PAGINATION_BOUNDS } from '../constants';

export {
  DEFAULT_MAX_LIMIT,
  DEFAULT_MAX_OFFSET,
  DEFAULT_MIN_LIMIT,
  DEFAULT_MIN_OFFSET,
  PAGINATION_BOUNDS,
} from '../constants';

export function normalizePagination(
  query: PaginationQuery,
  bounds: PaginationBounds = PAGINATION_BOUNDS,
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

export function slicePaginated<T>(
  items: T[],
  page: { limit: number; offset: number },
): PaginatedItemsResponse<T> {
  const hasMore = items.length > page.limit;
  return {
    items: hasMore ? items.slice(0, page.limit) : items,
    limit: page.limit,
    offset: page.offset,
    has_more: hasMore,
  };
}
