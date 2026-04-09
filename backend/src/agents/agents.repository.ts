import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/pg-pool.provider';
import { CreateAgentDto } from './dto/create-agent.dto';
import type { AgentRecord, AgentStatus } from '../common/types/agents';

@Injectable()
export class AgentsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(agent: CreateAgentDto): Promise<AgentRecord> {
    const query = `
      INSERT INTO agents (codename, terms_accepted)
      VALUES ($1, $2)
      RETURNING id, codename, terms_accepted, status, created_at, updated_at;
    `;

    const values = [agent.codename, agent.terms_accepted];

    const result = await this.pool.query<AgentRecord>(query, values);
    return result.rows[0];
  }

  async updateStatus(agentId: string, status: AgentStatus): Promise<AgentRecord | null> {
    const query = `
      UPDATE agents
      SET status = $2
      WHERE id = $1
      RETURNING id, codename, terms_accepted, status, created_at, updated_at;
    `;
    const result = await this.pool.query<AgentRecord>(query, [agentId, status]);
    return result.rows[0] ?? null;
  }
}
