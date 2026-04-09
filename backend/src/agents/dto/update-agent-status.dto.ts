import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ALLOWED_AGENT_STATUSES, type AgentStatus } from '../../common/types/agents';

export { ALLOWED_AGENT_STATUSES, type AgentStatus } from '../../common/types/agents';

export class UpdateAgentStatusDto {
  @ApiProperty({ enum: ALLOWED_AGENT_STATUSES, example: 'ACTIVE' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @IsIn(ALLOWED_AGENT_STATUSES)
  status!: AgentStatus;
}
