import { NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import { ERROR_MESSAGES } from '../error-messages';

export async function assertAgentsExist(pool: Pool, agentIds: string[]): Promise<void> {
  const uniqueAgentIds = [...new Set(agentIds)];
  if (uniqueAgentIds.length === 0) return;

  const result = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM agents WHERE id = ANY($1::uuid[])',
    [uniqueAgentIds],
  );
  const count = Number(result.rows[0]?.count ?? 0);
  if (count !== uniqueAgentIds.length) {
    throw new NotFoundException(ERROR_MESSAGES.AGENT_NOT_FOUND);
  }
}

export async function assertAgentExists(pool: Pool, agentId: string): Promise<void> {
  await assertAgentsExist(pool, [agentId]);
}
