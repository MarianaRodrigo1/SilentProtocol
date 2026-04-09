import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import type { ListAgentsQueryDto } from '../agents/dto/list-agents-query.dto';
import type { PaginationQueryDto } from '../agents/dto/pagination-query.dto';
import { ERROR_MESSAGES } from '../common/error-messages';
import type {
  AgentLocationRecord,
  AgentReportSummary,
  AgentWithLastLocation,
  PaginatedItemsResponse,
} from '../common/types/agents';
import {
  normalizePagination,
  PAGINATION_BOUNDS,
  slicePaginated,
} from '../common/utils/pagination';
import { assertAgentExists, assertAgentsExist } from '../common/utils/agent-existence';
import { assertNonEmptyIngestBatch } from '../common/utils/ingest-batch';
import { PG_POOL } from '../database/pg-pool.provider';
import { CreateContactDto } from './dto/create-contact.dto';
import { CreateLocationDto } from './dto/create-location.dto';
import { CreateMediaDto } from './dto/create-media.dto';
import { CreateScanDto } from './dto/create-scan.dto';
import { deleteUploadedMedia } from './intelligence.media-upload';
import { IntelligenceRepository } from './intelligence.repository';
import {
  InsertedCountResponse,
  InsertedMediaRecord,
  LocationBatchInsertResponse,
} from '../common/types/telemetry';

@Injectable()
export class IntelligenceService {
  constructor(
    private readonly intelligenceRepository: IntelligenceRepository,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

  async createScansBatch(scans: CreateScanDto[]): Promise<InsertedCountResponse> {
    assertNonEmptyIngestBatch(scans, 'Scans');
    await assertAgentsExist(this.pool, scans.map((scan) => scan.agent_id));
    return this.intelligenceRepository.insertScans(scans);
  }

  async createContactsBatch(contacts: CreateContactDto[]): Promise<InsertedCountResponse> {
    assertNonEmptyIngestBatch(contacts, 'Contacts');
    await assertAgentsExist(this.pool, contacts.map((contact) => contact.agent_id));
    return this.intelligenceRepository.insertContacts(contacts);
  }

  async createLocationsBatch(locations: CreateLocationDto[]): Promise<LocationBatchInsertResponse> {
    assertNonEmptyIngestBatch(locations, 'Locations');
    await assertAgentsExist(this.pool, locations.map((row) => row.agent_id));

    const insertedRows = await this.intelligenceRepository.insertLocationRows(locations);
    return {
      inserted: insertedRows.length,
      skipped_duplicates: locations.length - insertedRows.length,
    };
  }

  private async createMedia(
    payload: CreateMediaDto,
    mediaPath: string,
    metadata: Record<string, unknown>,
  ): Promise<InsertedMediaRecord> {
    await assertAgentExists(this.pool, payload.agent_id);
    return this.intelligenceRepository.insertMedia(payload, mediaPath, metadata);
  }

  async createMediaFromUpload(
    payload: CreateMediaDto,
    file: Express.Multer.File | undefined,
  ): Promise<InsertedMediaRecord> {
    if (!file) {
      throw new BadRequestException(ERROR_MESSAGES.MEDIA_FILE_REQUIRED);
    }
    const mediaPath = `/uploads/${file.filename}`;
    try {
      return await this.createMedia(payload, mediaPath, {
        original_name: file.originalname,
        mime_type: file.mimetype,
        size_bytes: file.size,
      });
    } catch (error: unknown) {
      await deleteUploadedMedia(file.filename);
      throw error;
    }
  }

  async listAgentsWithLastLocation(
    query: ListAgentsQueryDto = {},
  ): Promise<PaginatedItemsResponse<AgentWithLastLocation>> {
    const normalized = normalizePagination(query, PAGINATION_BOUNDS);
    const items = await this.intelligenceRepository.findAllWithLastLocation({
      limit: normalized.limit + 1,
      offset: normalized.offset,
      status: query.status,
    });
    return slicePaginated(items, normalized);
  }

  async getAgentReportSummary(agentId: string): Promise<AgentReportSummary> {
    const summary = await this.intelligenceRepository.getAgentReportSummary(agentId);
    if (!summary) {
      throw new NotFoundException(ERROR_MESSAGES.AGENT_NOT_FOUND);
    }
    return summary;
  }

  async getAgentLocations(
    agentId: string,
    query: PaginationQueryDto = {},
  ): Promise<PaginatedItemsResponse<AgentLocationRecord>> {
    const normalized = normalizePagination(query, PAGINATION_BOUNDS);
    const items = await this.intelligenceRepository.getLocationsPage(agentId, {
      limit: normalized.limit + 1,
      offset: normalized.offset,
    });
    if (items.length === 0) {
      await assertAgentExists(this.pool, agentId);
    }
    return slicePaginated(items, normalized);
  }
}
