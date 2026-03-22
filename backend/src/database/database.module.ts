import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PG_POOL } from './database.constants';

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

@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<Pool> => {
        const retryAttempts = Math.max(1, parseNumberEnv(configService, 'DB_RETRY_ATTEMPTS', 5));
        const retryDelayMs = Math.max(0, parseNumberEnv(configService, 'DB_RETRY_DELAY_MS', 2000));

        const pool = new Pool({
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: parseNumberEnv(configService, 'DB_PORT', 5432),
          database: configService.get<string>('DB_NAME', 'silent_protocol'),
          user: configService.get<string>('DB_USER', 'spy_admin'),
          password: configService.get<string>('DB_PASSWORD', 'spy_password'),
          max: Math.max(1, parseNumberEnv(configService, 'DB_POOL_MAX', 20)),
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 10_000,
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
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
