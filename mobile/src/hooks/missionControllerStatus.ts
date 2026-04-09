import { isRetryableApiError, updateAgentStatus } from '../api';
import { AGENT_STATUS_SYNC_BACKOFF_BASE_MS, AGENT_STATUS_SYNC_MAX_ATTEMPTS } from '../constants';
import { delay } from '../utils/promiseUtils';

export async function syncAgentStatusBestEffort(
  agentId: string,
  status: 'ACTIVE' | 'COMPLETED',
): Promise<void> {
  for (let attempt = 1; attempt <= AGENT_STATUS_SYNC_MAX_ATTEMPTS; attempt += 1) {
    try {
      await updateAgentStatus(agentId, status);
      return;
    } catch (error: unknown) {
      if (!isRetryableApiError(error)) return;
      if (attempt === AGENT_STATUS_SYNC_MAX_ATTEMPTS) return;
      await delay(AGENT_STATUS_SYNC_BACKOFF_BASE_MS * attempt);
    }
  }
}
