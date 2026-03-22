import { IsBoolean, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAgentDto {
  @ApiProperty({ example: 'ECHO-7', maxLength: 80 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  codename!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  biometric_confirmed!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  terms_accepted!: boolean;
}
