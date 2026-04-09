import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateContactDto {
  @ApiProperty({ format: 'uuid' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsUUID('4')
  agent_id!: string;

  @ApiProperty({ maxLength: 255, example: 'f2c7f0f46fda5b5f41268f3f6f6ef88f' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  contact_hash!: string;

  @ApiProperty({ maxLength: 120, example: 'device_address_book' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  leak_source!: string;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high'], example: 'medium' })
  @IsOptional()
  @IsString()
  @IsIn(['low', 'medium', 'high'])
  risk_level?: 'low' | 'medium' | 'high';
}
