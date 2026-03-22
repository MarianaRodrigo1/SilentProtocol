import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

function toFiniteNumber(value: unknown, options: { emptyAsUndefined: boolean }): unknown {
  if (value === null || value === undefined || value === '') {
    return options.emptyAsUndefined ? undefined : value;
  }
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : value;
}

export class CreateLocationDto {
  @ApiProperty({ example: -23.55052, minimum: -90, maximum: 90 })
  @Transform(({ value }) => toFiniteNumber(value, { emptyAsUndefined: false }))
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: -46.633308, minimum: -180, maximum: 180 })
  @Transform(({ value }) => toFiniteNumber(value, { emptyAsUndefined: false }))
  @IsLongitude()
  longitude!: number;

  @ApiPropertyOptional({ example: 8.5, minimum: 0 })
  @IsOptional()
  @Transform(({ value }) => toFiniteNumber(value, { emptyAsUndefined: true }))
  @IsNumber()
  @Min(0)
  accuracy_meters?: number;

  @ApiPropertyOptional({ example: 'foreground_sync', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;

  @ApiPropertyOptional({ example: '2026-03-21T16:10:00.000Z' })
  @IsOptional()
  @IsDateString()
  captured_at?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsUUID('4')
  event_id?: string;

  @ApiProperty({ format: 'uuid' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsUUID('4')
  agent_id!: string;
}
