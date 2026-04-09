import { join } from 'node:path';
import type { PaginationBounds } from './types/pagination';

export const UPLOADS_DIR = join(process.cwd(), 'uploads');
export const PUBLIC_DIR = join(process.cwd(), 'public');

export const MAX_MEDIA_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME_PREFIXES = ['image/'] as const;

export const DEFAULT_HTTP_PORT = 3000;

export const DEFAULT_CORS_ORIGINS =
  'http://localhost:8081,http://localhost:19006,http://127.0.0.1:8081,http://127.0.0.1:19006';

export const BATCH_VALIDATION_PIPE_OPTIONS = {
  transformOptions: { enableImplicitConversion: true },
  whitelist: true,
  forbidNonWhitelisted: true,
} as const;

export const MAX_INGEST_BATCH_SIZE = 100;

export const DEFAULT_MIN_LIMIT = 1;
export const DEFAULT_MAX_LIMIT = 500;
export const DEFAULT_MIN_OFFSET = 0;
export const DEFAULT_MAX_OFFSET = 10_000;

export const PAGINATION_BOUNDS: PaginationBounds = {
  defaultLimit: 100,
  minLimit: DEFAULT_MIN_LIMIT,
  maxLimit: DEFAULT_MAX_LIMIT,
  minOffset: DEFAULT_MIN_OFFSET,
  maxOffset: DEFAULT_MAX_OFFSET,
};

export const DB_DEFAULT_HOST = 'localhost';
export const DB_DEFAULT_PORT = 5432;
export const DB_DEFAULT_NAME = 'silent_protocol';
export const DB_DEFAULT_USER = 'spy_admin';
export const DB_DEFAULT_PASSWORD = 'spy_password';
export const DB_DEFAULT_RETRY_ATTEMPTS = 5;
export const DB_DEFAULT_RETRY_DELAY_MS = 2000;
export const DB_DEFAULT_POOL_MAX = 20;
export const DB_POOL_IDLE_TIMEOUT_MS = 30_000;
export const DB_POOL_CONNECTION_TIMEOUT_MS = 10_000;
