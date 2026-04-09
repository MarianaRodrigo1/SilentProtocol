import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageKeys } from '../constants';
import type { AgentSession, GameSessionSnapshot, LocalEvidence } from '../features/session/session.types';
import {
  TRACKING_LAST_BACKGROUND_ERROR_AT_KEY,
  clearTelemetrySession,
  stopBackgroundLocationUpdatesAsync,
} from '../locationTelemetry';
import { clearBluetoothOutboxStorage } from '../services/bluetoothOutbox';
import { clearContactsOutboxStorage } from '../services/contactsOutbox';
import { clearLocationOutboxStorage } from '../services/locationOutbox';
import { clearMediaOutboxStorage } from '../services/mediaOutbox';
import { createSerialExclusiveRunner } from '../utils/storageSerialQueue';
import { clearAllTelemetryMirrors } from './localTelemetryMirror';

const DEFAULT_EVIDENCE: LocalEvidence = {
  targetPhotoUri: null,
  stealthPhotoUri: null,
};

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const runExclusive = createSerialExclusiveRunner();

function isLocalEvidenceShape(ev: unknown): ev is Record<keyof LocalEvidence, unknown> {
  return (
    ev !== null &&
    typeof ev === 'object' &&
    'targetPhotoUri' in ev &&
    'stealthPhotoUri' in ev
  );
}

function normalizeEvidence(ev: unknown): LocalEvidence {
  if (!isLocalEvidenceShape(ev)) return { ...DEFAULT_EVIDENCE };
  return {
    targetPhotoUri: typeof ev.targetPhotoUri === 'string' ? ev.targetPhotoUri : null,
    stealthPhotoUri: typeof ev.stealthPhotoUri === 'string' ? ev.stealthPhotoUri : null,
  };
}

function normalizeAgent(raw: unknown): AgentSession | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object') return null;

  const candidate = raw as Partial<AgentSession>;
  if (
    typeof candidate.id !== 'string' ||
    !UUID_V4_REGEX.test(candidate.id) ||
    typeof candidate.codename !== 'string' ||
    candidate.codename.trim().length === 0
  ) {
    return null;
  }

  return {
    id: candidate.id,
    codename: candidate.codename,
    mode: candidate.mode === 'offline' ? 'offline' : 'online',
  };
}

function normalizeSnapshot(data: unknown): GameSessionSnapshot | null {
  if (data === null || typeof data !== 'object') return null;

  const record = data as Record<string, unknown>;
  const agentRaw = record.agent;

  if (agentRaw !== null && agentRaw !== undefined) {
    const agent = normalizeAgent(agentRaw);
    if (!agent) return null;
    return {
      agent,
      missionDone: Boolean(record.missionDone),
      localEvidence: normalizeEvidence(record.localEvidence),
    };
  }

  return {
    agent: null,
    missionDone: Boolean(record.missionDone),
    localEvidence: normalizeEvidence(record.localEvidence),
  };
}

export async function loadGameSession(): Promise<GameSessionSnapshot | null> {
  return runExclusive(async () => {
    const raw = await AsyncStorage.getItem(AsyncStorageKeys.gameSession);
    if (!raw) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      await AsyncStorage.removeItem(AsyncStorageKeys.gameSession);
      return null;
    }

    const snapshot = normalizeSnapshot(parsed);
    if (!snapshot) {
      await AsyncStorage.removeItem(AsyncStorageKeys.gameSession);
      return null;
    }

    return snapshot;
  });
}

export async function saveGameSession(snapshot: GameSessionSnapshot): Promise<void> {
  await runExclusive(() => AsyncStorage.setItem(AsyncStorageKeys.gameSession, JSON.stringify(snapshot)));
}

export async function clearGameSession(): Promise<void> {
  await stopBackgroundLocationUpdatesAsync();
  await runExclusive(async () => {
    await Promise.all([
      AsyncStorage.removeItem(AsyncStorageKeys.gameSession),
      clearLocationOutboxStorage(),
      clearContactsOutboxStorage(),
      clearBluetoothOutboxStorage(),
      clearMediaOutboxStorage(),
      clearTelemetrySession(),
      AsyncStorage.removeItem(TRACKING_LAST_BACKGROUND_ERROR_AT_KEY),
    ]);
    await clearAllTelemetryMirrors();
  });
}
