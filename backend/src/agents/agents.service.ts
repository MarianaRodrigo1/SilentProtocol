import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from '../common/error-messages';
import { AgentsRepository } from './agents.repository';
import { CreateAgentDto } from './dto/create-agent.dto';
import type { ListAgentsQueryDto } from './dto/list-agents-query.dto';
import type { PaginationQueryDto } from './dto/pagination-query.dto';
import { UpdateAgentStatusDto } from './dto/update-agent-status.dto';
import { IntelligenceService } from '../intelligence/intelligence.service';
import type { AgentRecord, AgentWithLastLocation, PaginatedItemsResponse } from '../common/types/agents';

@Injectable()
export class AgentsService {
  private normalizeCodename(rawCodename: string): string {
    return rawCodename.trim().replace(/\s+/g, ' ').toUpperCase();
  }

  constructor(
    private readonly agentsRepository: AgentsRepository,
    private readonly intelligenceService: IntelligenceService,
  ) {}

  async getAllWithLastLocation(query: ListAgentsQueryDto = {}): Promise<PaginatedItemsResponse<AgentWithLastLocation>> {
    return this.intelligenceService.listAgentsWithLastLocation(query);
  }

  async createAgent(payload: CreateAgentDto): Promise<AgentRecord> {
    if (!payload.terms_accepted) {
      throw new BadRequestException(ERROR_MESSAGES.AGENT_ENROLLMENT_INCOMPLETE);
    }
    const codename = this.normalizeCodename(payload.codename);
    if (codename.length < 3) {
      throw new BadRequestException(ERROR_MESSAGES.AGENT_CODENAME_INVALID);
    }
    return this.agentsRepository.create({
      ...payload,
      codename,
    });
  }

  async getAgentReportSummary(agentId: string) {
    return this.intelligenceService.getAgentReportSummary(agentId);
  }

  async getAgentLocations(agentId: string, query: PaginationQueryDto = {}) {
    return this.intelligenceService.getAgentLocations(agentId, query);
  }

  async updateAgentStatus(agentId: string, payload: UpdateAgentStatusDto): Promise<AgentRecord> {
    const updated = await this.agentsRepository.updateStatus(agentId, payload.status);
    if (!updated) {
      throw new NotFoundException(ERROR_MESSAGES.AGENT_NOT_FOUND);
    }
    return updated;
  }

}
