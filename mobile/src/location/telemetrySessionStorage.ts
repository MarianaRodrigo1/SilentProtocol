import AsyncStorage from '@react-native-async-storage/async-storage';

const TELEMETRY_SESSION_STORAGE_KEY = 'silent_protocol_telemetry_session_v1';

const LEGACY_AGENT_KEY = 'silent_protocol_tracking_agent_id';
const LEGACY_SYNC_KEY = 'silent_protocol_tracking_sync_enabled';

interface TelemetrySessionV1 {
  v: 1;
  agentId: string;
  syncToServer: boolean;
}

function isSessionV1(raw: unknown): raw is TelemetrySessionV1 {
  if (raw === null || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  return (
    o.v === 1 &&
    typeof o.agentId === 'string' &&
    o.agentId.trim().length > 0 &&
    typeof o.syncToServer === 'boolean'
  );
}

export async function persistTelemetrySession(agentId: string, syncToServer: boolean): Promise<void> {
  const normalized = agentId.trim().toLowerCase();
  const payload: TelemetrySessionV1 = { v: 1, agentId: normalized, syncToServer };
  await AsyncStorage.setItem(TELEMETRY_SESSION_STORAGE_KEY, JSON.stringify(payload));
}

export async function readTelemetrySession(): Promise<{ agentId: string; syncToServer: boolean } | null> {
  const raw = await AsyncStorage.getItem(TELEMETRY_SESSION_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (isSessionV1(parsed)) {
        return {
          agentId: parsed.agentId.trim().toLowerCase(),
          syncToServer: parsed.syncToServer,
        };
      }
    } catch {
      return null;
    }
    return null;
  }

  const [legacyAgent, legacySync] = await Promise.all([
    AsyncStorage.getItem(LEGACY_AGENT_KEY),
    AsyncStorage.getItem(LEGACY_SYNC_KEY),
  ]);
  const trimmed = legacyAgent?.trim();
  if (!trimmed) return null;

  const syncToServer = legacySync === '1';
  await persistTelemetrySession(trimmed, syncToServer);
  await AsyncStorage.multiRemove([LEGACY_AGENT_KEY, LEGACY_SYNC_KEY]);
  return { agentId: trimmed.toLowerCase(), syncToServer };
}

export async function updateTelemetrySessionSyncToServer(syncToServer: boolean): Promise<void> {
  const session = await readTelemetrySession();
  if (!session) return;
  await persistTelemetrySession(session.agentId, syncToServer);
}

export async function clearTelemetrySession(): Promise<void> {
  await AsyncStorage.multiRemove([TELEMETRY_SESSION_STORAGE_KEY, LEGACY_AGENT_KEY, LEGACY_SYNC_KEY]);
}
