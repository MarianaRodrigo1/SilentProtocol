import { join } from 'node:path';

export const UPLOADS_DIR = join(process.cwd(), 'uploads');
export const PUBLIC_DIR = join(process.cwd(), 'public');

export const MAX_MEDIA_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MEDIA_MIME_PREFIXES = ['image/', 'video/'] as const;
