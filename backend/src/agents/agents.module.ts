import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AgentsController } from './agents.controller';
import { AgentsRepository } from './agents.repository';
import { AgentsService } from './agents.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AgentsController],
  providers: [AgentsService, AgentsRepository],
  exports: [AgentsService],
})
export class AgentsModule {}
