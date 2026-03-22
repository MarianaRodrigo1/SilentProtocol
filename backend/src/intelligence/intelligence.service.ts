import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from '../common/error-messages';
import { AgentsService } from '../agents/agents.service';
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
} from './intelligence.types';

const MAX_BATCH_SIZE = 100;

const LOCATIONS_AGENT_FK_CONSTRAINT = 'fk_locations_agent_id';

function isMissingAgentForLocationInsert(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const pg = error as { code?: unknown; constraint?: unknown };
  return pg.code === '23503' && pg.constraint === LOCATIONS_AGENT_FK_CONSTRAINT;
}

@Injectable()
export class IntelligenceService {
  constructor(
    private readonly intelligenceRepository: IntelligenceRepository,
    private readonly agentsService: AgentsService,
  ) {}

  private ensureNonEmptyBatch<T>(items: T[], label: string): void {
    if (items.length === 0) {
      throw new BadRequestException(ERROR_MESSAGES.BATCH_EMPTY(label));
    }
    if (items.length > MAX_BATCH_SIZE) {
      throw new BadRequestException(ERROR_MESSAGES.BATCH_LIMIT_EXCEEDED(label, MAX_BATCH_SIZE));
    }
  }

  private async ensureLocationOwnershipByAgent(
    refs: Array<{ agent_id: string; location_id?: string }>,
  ): Promise<void> {
    const normalizedRefs = refs
      .map((ref) => ({
        agent_id: ref.agent_id,
        location_id: ref.location_id?.trim(),
      }))
      .filter(
        (ref): ref is { agent_id: string; location_id: string } =>
          typeof ref.location_id === 'string' && ref.location_id.length > 0,
      );
    if (normalizedRefs.length === 0) return;

    const uniqueRefs = [
      ...new Map(normalizedRefs.map((ref) => [`${ref.agent_id}|${ref.location_id}`, ref])).values(),
    ];
    const validOwnedLocations = await this.intelligenceRepository.countOwnedLocationsByAgent(uniqueRefs);
    if (validOwnedLocations !== uniqueRefs.length) {
      throw new BadRequestException(ERROR_MESSAGES.LOCATION_OWNERSHIP_INVALID);
    }
  }

  private async ensureAgentsAndLocationOwnership(
    refs: Array<{ agent_id: string; location_id?: string }>,
  ): Promise<void> {
    await this.agentsService.ensureAgentsExist(refs.map((ref) => ref.agent_id));
    await this.ensureLocationOwnershipByAgent(refs);
  }

  async createScansBatch(scans: CreateScanDto[]): Promise<InsertedCountResponse> {
    this.ensureNonEmptyBatch(scans, 'Scans');
    await this.ensureAgentsAndLocationOwnership(
      scans.map((scan) => ({
        agent_id: scan.agent_id,
        location_id: scan.location_id,
      })),
    );
    return this.intelligenceRepository.insertScans(scans);
  }

  async createContactsBatch(contacts: CreateContactDto[]): Promise<InsertedCountResponse> {
    this.ensureNonEmptyBatch(contacts, 'Contacts');
    await this.ensureAgentsAndLocationOwnership(
      contacts.map((contact) => ({
        agent_id: contact.agent_id,
        location_id: contact.location_id,
      })),
    );
    return this.intelligenceRepository.insertContacts(contacts);
  }

  async createLocationsBatch(locations: CreateLocationDto[]): Promise<LocationBatchInsertResponse> {
    this.ensureNonEmptyBatch(locations, 'Locations');

    try {
      const insertedRows = await this.intelligenceRepository.insertLocationRows(locations);
      return {
        inserted: insertedRows.length,
        skipped_duplicates: locations.length - insertedRows.length,
      };
    } catch (error: unknown) {
      if (isMissingAgentForLocationInsert(error)) {
        throw new NotFoundException(ERROR_MESSAGES.AGENT_NOT_FOUND);
      }
      throw error;
    }
  }

  private async createMedia(
    payload: CreateMediaDto,
    mediaPath: string,
    metadata: Record<string, unknown>,
  ): Promise<InsertedMediaRecord> {
    await this.ensureAgentsAndLocationOwnership([
      { agent_id: payload.agent_id, location_id: payload.location_id },
    ]);
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
}
