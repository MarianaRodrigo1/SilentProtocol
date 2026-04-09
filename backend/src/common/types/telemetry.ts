import { ApiProperty } from '@nestjs/swagger';

export interface InsertedMediaRecord {
  id: string;
  media_url: string;
  media_type: 'TARGET' | 'STEALTH';
}

export interface InsertedCountResponse {
  inserted: number;
}

export class LocationBatchInsertResponse {
  @ApiProperty({ example: 12, description: 'Number of new location rows inserted.' })
  inserted!: number;

  @ApiProperty({
    example: 2,
    description: 'Rows skipped because the same agent_id + event_id already existed (idempotent retries).',
  })
  skipped_duplicates!: number;
}

export interface InsertedLocationRow {
  id: string;
  agent_id: string;
  created_at: Date;
}
