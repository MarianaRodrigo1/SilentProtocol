import { updateAgentStatus } from '../api/agents';
import { isRetryableApiError } from '../api/http';
import { delay } from '../utils/async';

export async function syncAgentStatusBestEffort(
  agentId: string,
  status: 'MISSION_ACTIVE' | 'MISSION_COMPLETE',
): Promise<void> {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await updateAgentStatus(agentId, status);
      return;
    } catch (error: unknown) {
      if (!isRetryableApiError(error)) return;
      if (attempt === maxAttempts) return;
      await delay(600 * attempt);
    }
  }
}
