import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateScanDto {
  @ApiProperty({ format: 'uuid' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsUUID('4')
  agent_id!: string;

  @ApiProperty({ example: 'AA:BB:CC:DD:EE:FF', maxLength: 17 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(17)
  @Matches(/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  mac_address!: string;

  @ApiPropertyOptional({ example: 'Headset-X', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  device_name?: string;

  @ApiPropertyOptional({ example: -72, minimum: -130 })
  @IsOptional()
  @IsInt()
  @Min(-130)
  rssi?: number;
}
