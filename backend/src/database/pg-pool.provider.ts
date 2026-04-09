import type { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import {
  DB_DEFAULT_HOST,
  DB_DEFAULT_NAME,
  DB_DEFAULT_PASSWORD,
  DB_DEFAULT_POOL_MAX,
  DB_DEFAULT_PORT,
  DB_DEFAULT_RETRY_ATTEMPTS,
  DB_DEFAULT_RETRY_DELAY_MS,
  DB_DEFAULT_USER,
  DB_POOL_CONNECTION_TIMEOUT_MS,
  DB_POOL_IDLE_TIMEOUT_MS,
} from '../common/constants';

export const PG_POOL = Symbol('PG_POOL');

function parseNumberEnv(
  configService: ConfigService,
  key: string,
  fallback: number,
): number {
  const raw = configService.get<string>(key);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export const pgPoolProvider: Provider = {
  provide: PG_POOL,
  inject: [ConfigService],
  useFactory: async (configService: ConfigService): Promise<Pool> => {
    const retryAttempts = Math.max(
      1,
      parseNumberEnv(configService, 'DB_RETRY_ATTEMPTS', DB_DEFAULT_RETRY_ATTEMPTS),
    );
    const retryDelayMs = Math.max(
      0,
      parseNumberEnv(configService, 'DB_RETRY_DELAY_MS', DB_DEFAULT_RETRY_DELAY_MS),
    );

    const pool = new Pool({
      host: configService.get<string>('DB_HOST', DB_DEFAULT_HOST),
      port: parseNumberEnv(configService, 'DB_PORT', DB_DEFAULT_PORT),
      database: configService.get<string>('DB_NAME', DB_DEFAULT_NAME),
      user: configService.get<string>('DB_USER', DB_DEFAULT_USER),
      password: configService.get<string>('DB_PASSWORD', DB_DEFAULT_PASSWORD),
      max: Math.max(1, parseNumberEnv(configService, 'DB_POOL_MAX', DB_DEFAULT_POOL_MAX)),
      idleTimeoutMillis: DB_POOL_IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: DB_POOL_CONNECTION_TIMEOUT_MS,
    });

    let lastError: unknown;
    for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
      try {
        const client = await pool.connect();
        client.release();
        return pool;
      } catch (error) {
        lastError = error;
        if (attempt === retryAttempts) break;
        await sleep(retryDelayMs);
      }
    }

    await pool.end();
    const isRefused =
      lastError instanceof Error &&
      'code' in lastError &&
      (lastError as NodeJS.ErrnoException).code === 'ECONNREFUSED';
    const hint = isRefused
      ? ' Make sure PostgreSQL is running (e.g. docker-compose up -d database).'
      : '';
    throw lastError instanceof Error
      ? new Error(`${lastError.message}${hint}`, { cause: lastError })
      : new Error(`Failed to establish PostgreSQL pool connection.${hint}`);
  },
};
