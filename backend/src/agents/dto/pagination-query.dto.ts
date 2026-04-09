import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  DEFAULT_MAX_LIMIT,
  DEFAULT_MAX_OFFSET,
  DEFAULT_MIN_LIMIT,
  DEFAULT_MIN_OFFSET,
  PAGINATION_BOUNDS,
} from '../../common/constants';

export class PaginationQueryDto {
  @ApiPropertyOptional({
    minimum: DEFAULT_MIN_OFFSET,
    maximum: DEFAULT_MAX_OFFSET,
    default: DEFAULT_MIN_OFFSET,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(DEFAULT_MIN_OFFSET)
  @Max(DEFAULT_MAX_OFFSET)
  offset?: number;

  @ApiPropertyOptional({
    minimum: DEFAULT_MIN_LIMIT,
    maximum: DEFAULT_MAX_LIMIT,
    default: PAGINATION_BOUNDS.defaultLimit,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(DEFAULT_MIN_LIMIT)
  @Max(DEFAULT_MAX_LIMIT)
  limit?: number;
}
