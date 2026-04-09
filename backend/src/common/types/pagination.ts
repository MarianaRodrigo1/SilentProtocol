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
