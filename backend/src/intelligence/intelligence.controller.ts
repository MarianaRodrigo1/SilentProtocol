import { Body, Controller, HttpCode, HttpStatus, ParseArrayPipe, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateContactDto } from './dto/create-contact.dto';
import { CreateLocationDto } from './dto/create-location.dto';
import { CreateMediaDto } from './dto/create-media.dto';
import { CreateScanDto } from './dto/create-scan.dto';
import { intelligenceMediaUploadOptions } from './intelligence.media-upload';
import type { InsertedCountResponse, InsertedMediaRecord } from '../common/types/telemetry';
import { LocationBatchInsertResponse } from '../common/types/telemetry';
import { BATCH_VALIDATION_PIPE_OPTIONS } from '../common/constants';
import { IntelligenceService } from './intelligence.service';

@ApiTags('intelligence')
@Controller('intelligence')
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  @Post('scans')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Ingest a batch of bluetooth scan telemetry (write path).' })
  @ApiCreatedResponse({ description: 'Scan batch accepted.' })
  @ApiBody({ type: CreateScanDto, isArray: true })
  async createScans(
    @Body(new ParseArrayPipe({ items: CreateScanDto, ...BATCH_VALIDATION_PIPE_OPTIONS }))
    scans: CreateScanDto[],
  ): Promise<InsertedCountResponse> {
    return this.intelligenceService.createScansBatch(scans);
  }

  @Post('contacts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Ingest a batch of leaked contacts telemetry (write path).' })
  @ApiCreatedResponse({ description: 'Contacts batch accepted.' })
  @ApiBody({ type: CreateContactDto, isArray: true })
  async createContacts(
    @Body(new ParseArrayPipe({ items: CreateContactDto, ...BATCH_VALIDATION_PIPE_OPTIONS }))
    contacts: CreateContactDto[],
  ): Promise<InsertedCountResponse> {
    return this.intelligenceService.createContactsBatch(contacts);
  }

  @Post('locations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Ingest a batch of location telemetry (write path).' })
  @ApiCreatedResponse({ description: 'Locations batch accepted.', type: LocationBatchInsertResponse })
  @ApiBody({ type: CreateLocationDto, isArray: true })
  async createLocations(
    @Body(new ParseArrayPipe({ items: CreateLocationDto, ...BATCH_VALIDATION_PIPE_OPTIONS }))
    locations: CreateLocationDto[],
  ): Promise<LocationBatchInsertResponse> {
    return this.intelligenceService.createLocationsBatch(locations);
  }

  @Post('media')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload one mission media record with metadata (write path).' })
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({ description: 'Media record inserted.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['agent_id', 'media_type', 'file'],
      properties: {
        agent_id: { type: 'string', format: 'uuid' },
        media_type: { type: 'string', enum: ['TARGET', 'STEALTH'] },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', intelligenceMediaUploadOptions as Parameters<typeof FileInterceptor>[1]),
  )
  async uploadMedia(
    @Body() payload: CreateMediaDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<InsertedMediaRecord> {
    return this.intelligenceService.createMediaFromUpload(payload, file);
  }
}
