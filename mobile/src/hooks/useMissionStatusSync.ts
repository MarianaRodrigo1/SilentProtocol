import { useCallback } from 'react';
import { syncAgentStatusBestEffort } from './missionControllerStatus';

type MissionStatus = 'ACTIVE' | 'COMPLETED';

interface UseMissionStatusSyncOptions {
  agentId: string;
  enabled: boolean;
}

export function useMissionStatusSync({ agentId, enabled }: UseMissionStatusSyncOptions) {
  const syncStatusIfNeeded = useCallback(
    async (status: MissionStatus): Promise<void> => {
      if (!enabled) return;
      await syncAgentStatusBestEffort(agentId, status);
    },
    [agentId, enabled],
  );

  return {
    syncStatusIfNeeded,
  };
}
