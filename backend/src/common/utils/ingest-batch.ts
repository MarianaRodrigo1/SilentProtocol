import { BadRequestException } from '@nestjs/common';
import { MAX_INGEST_BATCH_SIZE } from '../constants';
import { ERROR_MESSAGES } from '../error-messages';

export function assertNonEmptyIngestBatch<T>(items: T[], label: string): void {
  if (items.length === 0) {
    throw new BadRequestException(ERROR_MESSAGES.BATCH_EMPTY(label));
  }
  if (items.length > MAX_INGEST_BATCH_SIZE) {
    throw new BadRequestException(ERROR_MESSAGES.BATCH_LIMIT_EXCEEDED(label, MAX_INGEST_BATCH_SIZE));
  }
}
