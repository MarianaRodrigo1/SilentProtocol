import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PostLocationPayload } from '../api/contracts';
import { createSerialExclusiveRunner } from '../utils/storageSerialQueue';

const STORAGE_KEY = 'silent_protocol_local_telemetry_v1';

export interface StoredLocationRecord {
  id: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  source: string;
  captured_at: string;
  created_at: string;
}

export interface AgentTelemetryMirror {
  locations: StoredLocationRecord[];
  contactsLeaks: number;
  bluetoothScans: number;
}

type MirrorStore = Record<string, AgentTelemetryMirror>;

const runExclusive = createSerialExclusiveRunner();

function mirrorAgentKey(agentId: string): string {
  return agentId.trim().toLowerCase();
}

function emptyMirror(): AgentTelemetryMirror {
  return { locations: [], contactsLeaks: 0, bluetoothScans: 0 };
}

async function readStore(): Promise<MirrorStore> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as MirrorStore)
      : {};
  } catch {
    return {};
  }
}

async function writeStore(store: MirrorStore): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

function payloadsToRecords(payloads: PostLocationPayload[]): StoredLocationRecord[] {
  const now = new Date().toISOString();
  return payloads.map((p) => ({
    id: p.event_id,
    latitude: p.latitude,
    longitude: p.longitude,
    accuracy_meters: p.accuracy_meters ?? null,
    source: p.source ?? 'gps',
    captured_at: p.captured_at ?? now,
    created_at: now,
  }));
}

export function appendLocationPayloads(agentId: string, payloads: PostLocationPayload[]): Promise<number> {
  if (payloads.length === 0) return Promise.resolve(0);
  const key = mirrorAgentKey(agentId);
  return runExclusive(async () => {
    try {
      const store = await readStore();
      const prev = store[key] ?? emptyMirror();
      const nextRecords = payloadsToRecords(payloads);
      const seen = new Set(prev.locations.map((r) => r.id));
      const fresh = nextRecords.filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
      store[key] = {
        ...prev,
        locations: [...prev.locations, ...fresh].slice(-500),
      };
      await writeStore(store);
      return fresh.length;
    } catch {
      return 0;
    }
  });
}

export function addContactsLeakCount(agentId: string, count: number): Promise<void> {
  if (count <= 0) return Promise.resolve();
  const key = mirrorAgentKey(agentId);
  return runExclusive(async () => {
    try {
      const store = await readStore();
      const prev = store[key] ?? emptyMirror();
      store[key] = {
        ...prev,
        contactsLeaks: prev.contactsLeaks + count,
      };
      await writeStore(store);
    } catch {}
  });
}

export function addBluetoothScanCount(agentId: string, count: number): Promise<void> {
  if (count <= 0) return Promise.resolve();
  const key = mirrorAgentKey(agentId);
  return runExclusive(async () => {
    try {
      const store = await readStore();
      const prev = store[key] ?? emptyMirror();
      store[key] = {
        ...prev,
        bluetoothScans: prev.bluetoothScans + count,
      };
      await writeStore(store);
    } catch {}
  });
}

export async function getTelemetryMirror(agentId: string): Promise<AgentTelemetryMirror | null> {
  const key = mirrorAgentKey(agentId);
  return runExclusive(async () => {
    const store = await readStore();
    return store[key] ?? null;
  });
}

export async function clearAllTelemetryMirrors(): Promise<void> {
  await runExclusive(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {}
  });
}
