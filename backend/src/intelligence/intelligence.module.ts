import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { DatabaseModule } from '../database/database.module';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceRepository } from './intelligence.repository';
import { IntelligenceService } from './intelligence.service';

@Module({
  imports: [DatabaseModule, AgentsModule],
  controllers: [IntelligenceController],
  providers: [IntelligenceService, IntelligenceRepository],
})
export class IntelligenceModule {}
