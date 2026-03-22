import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from '../common/error-messages';
import { AgentsRepository } from './agents.repository';
import { CreateAgentDto } from './dto/create-agent.dto';
import { GetAgentTelemetryQueryDto } from './dto/get-agent-telemetry-query.dto';
import { GetAgentsQueryDto } from './dto/get-agents-query.dto';
import { UpdateAgentStatusDto } from './dto/update-agent-status.dto';
import { normalizePagination, PAGINATION_BOUNDS } from './agents.pagination';
import {
  AgentBluetoothScanRecord,
  AgentContactLeakRecord,
  AgentListQueryOptions,
  AgentLocationRecord,
  AgentRecord,
  AgentReportSummary,
  AgentTelemetryQueryOptions,
  AgentVisualEvidenceRecord,
  AgentWithLastLocation,
  PaginatedItemsResponse,
} from './agents.types';

@Injectable()
export class AgentsService {
  private normalizeCodename(rawCodename: string): string {
    return rawCodename.trim().replace(/\s+/g, ' ').toUpperCase();
  }

  constructor(private readonly agentsRepository: AgentsRepository) {}

  private normalizeTelemetryQuery(query: GetAgentTelemetryQueryDto = {}): AgentTelemetryQueryOptions {
    return normalizePagination(query, PAGINATION_BOUNDS);
  }

  private toPaginatedResponse<T>(
    items: T[],
    options: { limit: number; offset: number },
  ): PaginatedItemsResponse<T> {
    const hasMore = items.length > options.limit;
    return {
      items: hasMore ? items.slice(0, options.limit) : items,
      limit: options.limit,
      offset: options.offset,
      has_more: hasMore,
    };
  }

  private normalizeListQuery(query: GetAgentsQueryDto): AgentListQueryOptions {
    const normalized = normalizePagination(query, PAGINATION_BOUNDS);
    return { ...normalized, status: query.status };
  }

  private async getAgentTelemetryPage<T>(
    agentId: string,
    query: GetAgentTelemetryQueryDto,
    fetchPage: (options: AgentTelemetryQueryOptions) => Promise<T[]>,
  ): Promise<PaginatedItemsResponse<T>> {
    const normalized = this.normalizeTelemetryQuery(query);
    const items = await fetchPage({
      limit: normalized.limit + 1,
      offset: normalized.offset,
    });
    if (items.length === 0) {
      await this.ensureAgentExists(agentId);
    }
    return this.toPaginatedResponse(items, normalized);
  }

  async getAllWithLastLocation(
    query: GetAgentsQueryDto = {},
  ): Promise<PaginatedItemsResponse<AgentWithLastLocation>> {
    const normalized = this.normalizeListQuery(query);
    const items = await this.agentsRepository.findAllWithLastLocation({
      ...normalized,
      limit: normalized.limit + 1,
    });
    return this.toPaginatedResponse(items, normalized);
  }

  async createAgent(payload: CreateAgentDto): Promise<AgentRecord> {
    if (!payload.terms_accepted || !payload.biometric_confirmed) {
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

  async getAgentReportSummary(agentId: string): Promise<AgentReportSummary> {
    const summary = await this.agentsRepository.getAgentReportSummary(agentId);
    if (!summary) {
      throw new NotFoundException(ERROR_MESSAGES.AGENT_NOT_FOUND);
    }
    return summary;
  }

  async getAgentLocations(
    agentId: string,
    query: GetAgentTelemetryQueryDto = {},
  ): Promise<PaginatedItemsResponse<AgentLocationRecord>> {
    return this.getAgentTelemetryPage(agentId, query, (options) =>
      this.agentsRepository.getLocationsPage(agentId, options),
    );
  }

  async getAgentBluetoothScans(
    agentId: string,
    query: GetAgentTelemetryQueryDto = {},
  ): Promise<PaginatedItemsResponse<AgentBluetoothScanRecord>> {
    return this.getAgentTelemetryPage(agentId, query, (options) =>
      this.agentsRepository.getBluetoothScansPage(agentId, options),
    );
  }

  async getAgentContactsLeaks(
    agentId: string,
    query: GetAgentTelemetryQueryDto = {},
  ): Promise<PaginatedItemsResponse<AgentContactLeakRecord>> {
    return this.getAgentTelemetryPage(agentId, query, (options) =>
      this.agentsRepository.getContactsLeaksPage(agentId, options),
    );
  }

  async getAgentVisualEvidence(
    agentId: string,
    query: GetAgentTelemetryQueryDto = {},
  ): Promise<PaginatedItemsResponse<AgentVisualEvidenceRecord>> {
    return this.getAgentTelemetryPage(agentId, query, (options) =>
      this.agentsRepository.getVisualEvidencePage(agentId, options),
    );
  }

  async updateAgentStatus(agentId: string, payload: UpdateAgentStatusDto): Promise<AgentRecord> {
    const updated = await this.agentsRepository.updateStatus(agentId, payload.status);
    if (!updated) {
      throw new NotFoundException(ERROR_MESSAGES.AGENT_NOT_FOUND);
    }
    return updated;
  }

  async ensureAgentsExist(agentIds: string[]): Promise<void> {
    const uniqueAgentIds = [...new Set(agentIds)];
    if (uniqueAgentIds.length === 0) return;

    const existingCount = await this.agentsRepository.countByIds(uniqueAgentIds);
    if (existingCount !== uniqueAgentIds.length) {
      throw new NotFoundException(ERROR_MESSAGES.AGENT_NOT_FOUND);
    }
  }

  async ensureAgentExists(agentId: string): Promise<void> {
    const exists = await this.agentsRepository.existsById(agentId);
    if (!exists) {
      throw new NotFoundException(ERROR_MESSAGES.AGENT_NOT_FOUND);
    }
  }
}
