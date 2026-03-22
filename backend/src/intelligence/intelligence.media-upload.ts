import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { mkdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { extname, join } from 'node:path';
import {
  ALLOWED_MEDIA_MIME_PREFIXES,
  MAX_MEDIA_FILE_BYTES,
  UPLOADS_DIR,
} from '../common/constants';
import { ERROR_MESSAGES } from '../common/error-messages';

export const intelligenceMediaUploadOptions: MulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, callback) => {
      mkdirSync(UPLOADS_DIR, { recursive: true });
      callback(null, UPLOADS_DIR);
    },
    filename: (_req, file, callback) => {
      const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      callback(null, `intel-${suffix}${extname(file.originalname)}`);
    },
  }),
  limits: {
    fileSize: MAX_MEDIA_FILE_BYTES,
  },
  fileFilter: (_req, file, callback) => {
    const isAllowed = ALLOWED_MEDIA_MIME_PREFIXES.some((prefix) => file.mimetype.startsWith(prefix));
    if (!isAllowed) {
      callback(new BadRequestException(ERROR_MESSAGES.MEDIA_FILE_TYPE_INVALID), false);
      return;
    }
    callback(null, true);
  },
};

export async function deleteUploadedMedia(filename: string): Promise<void> {
  try {
    await unlink(join(UPLOADS_DIR, filename));
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code !== 'ENOENT') {
      throw error;
    }
  }
}
