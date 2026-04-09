import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceRepository } from './intelligence.repository';
import { IntelligenceService } from './intelligence.service';

@Module({
  imports: [DatabaseModule],
  controllers: [IntelligenceController],
  providers: [IntelligenceService, IntelligenceRepository],
  exports: [IntelligenceService],
})
export class IntelligenceModule {}
