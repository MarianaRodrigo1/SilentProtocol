import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const ALLOWED_AGENT_STATUSES = ['ACTIVE', 'MISSION_ACTIVE', 'MISSION_COMPLETE'] as const;
export type AgentStatus = (typeof ALLOWED_AGENT_STATUSES)[number];

export class UpdateAgentStatusDto {
  @ApiProperty({ enum: ALLOWED_AGENT_STATUSES, example: 'MISSION_ACTIVE' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @IsIn(ALLOWED_AGENT_STATUSES)
  status!: AgentStatus;
}
