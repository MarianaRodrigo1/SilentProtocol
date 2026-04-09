import { Module } from '@nestjs/common';
import { PG_POOL, pgPoolProvider } from './pg-pool.provider';

@Module({
  providers: [pgPoolProvider],
  exports: [PG_POOL],
})
export class DatabaseModule {}
