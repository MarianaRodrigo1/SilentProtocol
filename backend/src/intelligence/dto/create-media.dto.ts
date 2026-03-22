import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class CreateMediaDto {
  @ApiProperty({ format: 'uuid' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsUUID('4')
  agent_id!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsUUID('4')
  location_id?: string;

  @ApiProperty({ enum: ['TARGET', 'STEALTH'], example: 'TARGET' })
  @IsIn(['TARGET', 'STEALTH'])
  media_type!: 'TARGET' | 'STEALTH';
}
