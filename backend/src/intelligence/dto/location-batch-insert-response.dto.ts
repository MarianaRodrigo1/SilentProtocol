import { ApiProperty } from '@nestjs/swagger';

export class LocationBatchInsertResponseDto {
  @ApiProperty({ example: 12, description: 'Number of new location rows inserted.' })
  inserted!: number;

  @ApiProperty({
    example: 2,
    description: 'Rows skipped because the same agent_id + event_id already existed (idempotent retries).',
  })
  skipped_duplicates!: number;
}
