import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AgentsModule } from './agents/agents.module';
import { IntelligenceModule } from './intelligence/intelligence.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    AgentsModule,
    IntelligenceModule,
  ],
})
export class AppModule {}
