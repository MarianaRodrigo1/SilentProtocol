import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { ALLOWED_AGENT_STATUSES, AgentStatus } from './update-agent-status.dto';
import { PaginationQueryDto } from './pagination-query.dto';

export class GetAgentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ALLOWED_AGENT_STATUSES })
  @IsOptional()
  @IsIn(ALLOWED_AGENT_STATUSES)
  status?: AgentStatus;
}
