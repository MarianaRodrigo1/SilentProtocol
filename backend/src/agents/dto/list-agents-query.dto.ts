import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { ALLOWED_AGENT_STATUSES, type AgentStatus } from '../../common/types/agents';
import { PaginationQueryDto } from './pagination-query.dto';

export class ListAgentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ALLOWED_AGENT_STATUSES })
  @IsOptional()
  @IsIn(ALLOWED_AGENT_STATUSES)
  status?: AgentStatus;
}
