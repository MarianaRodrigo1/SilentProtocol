import type * as ExpoLocation from 'expo-location';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import type { MutableRefObject } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PostLocationPayload } from './api';
import { postLocationsBatch } from './api';
import {
  AsyncStorageKeys,
  BACKGROUND_LOCATION_TASK_NAME,
  GPS_BACKGROUND_OUTBOX_FLUSH_MAX_CHAIN,
  GPS_FIRST_SYNC_GRACE_EXTEND_MS,
  GPS_FIRST_SYNC_RETRY_ATTEMPTS,
  GPS_FIRST_SYNC_RETRY_DELAY_MS,
  LOCATION_UPDATE_INTERVAL_MS,
} from './constants';
import { enqueueLocationOutboxMany, flushLocationOutboxInBatches } from './services/locationOutbox';
import { appendLocationPayloads } from './storage/localTelemetryMirror';
import type { LocationSyncFailureReason, LocationSyncResult, TelemetrySyncResult } from './types/missionRuntime';
import { errResult, okResult } from './types/result';
import { delay, runBestEffort } from './utils/promiseUtils';

function bytesToUuid(bytes: Uint8Array): string {
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function stableBytesFromKey(key: string): Uint8Array {
  const out = new Uint8Array(16);
  const enc = new TextEncoder().encode(key);
  let a = 0xdeadbeef;
  let b = 0x41c6ce57;
  let c = 0xcafebabe;
  let d = 0x0badf00d;
  for (let i = 0; i < enc.length; i += 1) {
    const x = enc[i]!;
    a = Math.imul(a ^ x, 0x9e3779b1);
    b = Math.imul(b ^ a, 0x85ebca6b);
    c ^= Math.imul(b, x + i);
    d += Math.imul(c, x | 1);
  }
  const dw = new DataView(out.buffer);
  dw.setUint32(0, a >>> 0, false);
  dw.setUint32(4, b >>> 0, false);
  dw.setUint32(8, c >>> 0, false);
  dw.setUint32(12, d >>> 0, false);
  out[6] = (out[6] & 0x0f) | 0x40;
  out[8] = (out[8] & 0x3f) | 0x80;
  return out;
}

export function stableLocationEventId(
  agentId: string,
  capturedAtMs: number,
  latitude: number,
  longitude: number,
  bucketMs: number = LOCATION_UPDATE_INTERVAL_MS,
): string {
  const agent = agentId.trim().toLowerCase();
  const bucket = Math.floor(capturedAtMs / bucketMs) * bucketMs;
  const key = `${agent}|${bucket}|${latitude}|${longitude}`;
  return bytesToUuid(stableBytesFromKey(key));
}

export interface LocationPayloadInput {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  source: string;
  capturedAt?: number;
}

function sanitizeAccuracyMeters(value?: number | null): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (!Number.isFinite(value) || value < 0) return undefined;
  return value;
}

function roundCoord(value: number, maxDecimals: number): number {
  const f = 10 ** maxDecimals;
  return Math.round(value * f) / f;
}

function safeIsoFromMs(ms: number): string {
  const d = new Date(ms);
  if (!Number.isFinite(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

export function buildLocationPayload(agentId: string, params: LocationPayloadInput): PostLocationPayload {
  const lat = roundCoord(params.latitude, 8);
  const lon = roundCoord(params.longitude, 8);
  const capturedMs = params.capturedAt ?? Date.now();
  const normalizedAgentId = agentId.trim().toLowerCase();
  return {
    event_id: stableLocationEventId(normalizedAgentId, capturedMs, lat, lon),
    agent_id: normalizedAgentId,
    latitude: lat,
    longitude: lon,
    accuracy_meters: sanitizeAccuracyMeters(params.accuracy),
    source: params.source,
    created_at: safeIsoFromMs(capturedMs),
  };
}

function isExpoLocationObject(item: unknown): item is ExpoLocation.LocationObject {
  if (!item || typeof item !== 'object') return false;
  const coords = (item as { coords?: unknown }).coords;
  if (!coords || typeof coords !== 'object') return false;
  const lat = (coords as { latitude?: unknown }).latitude;
  const lon = (coords as { longitude?: unknown }).longitude;
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lon)
  );
}

function readExpoBackgroundTaskLocations(data: unknown): ExpoLocation.LocationObject[] {
  if (data === null || typeof data !== 'object') return [];
  const locs = (data as { locations?: unknown }).locations;
  if (!Array.isArray(locs)) return [];
  return locs.filter(isExpoLocationObject);
}

function payloadsFromExpoLocationObjects(
  agentId: string,
  locations: ExpoLocation.LocationObject[],
  source: LocationPayloadInput['source'],
): PostLocationPayload[] {
  return locations.map((item) =>
    buildLocationPayload(agentId, {
      latitude: item.coords.latitude,
      longitude: item.coords.longitude,
      accuracy: item.coords.accuracy ?? undefined,
      source,
      capturedAt: item.timestamp ?? Date.now(),
    }),
  );
}

export function payloadsFromBackgroundTaskData(agentId: string, data: unknown): PostLocationPayload[] {
  return payloadsFromExpoLocationObjects(agentId, readExpoBackgroundTaskLocations(data), 'background_task');
}

export async function mirrorAndEnqueueLocationPayloads(
  agentId: string,
  payloads: PostLocationPayload[],
  syncToServer: boolean,
): Promise<void> {
  if (payloads.length === 0) return;
  await appendLocationPayloads(agentId, payloads);
  if (syncToServer) {
    await enqueueLocationOutboxMany(payloads);
  }
}

export async function enqueueLocationSampleWithMirror(
  agentId: string,
  payload: PostLocationPayload,
  enqueue: (p: PostLocationPayload) => Promise<boolean>,
): Promise<{ queued: boolean; mirrorAppended: boolean }> {
  const mirrorAppended = (await appendLocationPayloads(agentId, [payload])) > 0;
  const queued = await enqueue(payload);
  return { queued, mirrorAppended };
}

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
  await AsyncStorage.setItem(AsyncStorageKeys.telemetrySession, JSON.stringify(payload));
}

export async function readTelemetrySession(): Promise<{ agentId: string; syncToServer: boolean } | null> {
  const raw = await AsyncStorage.getItem(AsyncStorageKeys.telemetrySession);
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
    AsyncStorage.getItem(AsyncStorageKeys.telemetrySessionLegacyAgent),
    AsyncStorage.getItem(AsyncStorageKeys.telemetrySessionLegacySync),
  ]);
  const trimmed = legacyAgent?.trim();
  if (!trimmed) return null;

  const syncToServer = legacySync === '1';
  await persistTelemetrySession(trimmed, syncToServer);
  await AsyncStorage.multiRemove([
    AsyncStorageKeys.telemetrySessionLegacyAgent,
    AsyncStorageKeys.telemetrySessionLegacySync,
  ]);
  return { agentId: trimmed.toLowerCase(), syncToServer };
}

export async function updateTelemetrySessionSyncToServer(syncToServer: boolean): Promise<void> {
  const session = await readTelemetrySession();
  if (!session) return;
  await persistTelemetrySession(session.agentId, syncToServer);
}

export async function clearTelemetrySession(): Promise<void> {
  await AsyncStorage.multiRemove([
    AsyncStorageKeys.telemetrySession,
    AsyncStorageKeys.telemetrySessionLegacyAgent,
    AsyncStorageKeys.telemetrySessionLegacySync,
  ]);
}

export const LOCATION_TELEMETRY_FAILURE_AT_KEY = AsyncStorageKeys.gpsTelemetryFailureAt;

export async function markLocationTelemetryFailure(): Promise<void> {
  await runBestEffort(() =>
    AsyncStorage.setItem(AsyncStorageKeys.gpsTelemetryFailureAt, String(Date.now())),
  );
}

export async function clearLocationTelemetryFailure(): Promise<void> {
  await runBestEffort(() => AsyncStorage.removeItem(AsyncStorageKeys.gpsTelemetryFailureAt));
}

export async function getLocationTelemetryFailureTimestamp(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(AsyncStorageKeys.gpsTelemetryFailureAt);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function isAppEligibleForForegroundLocation(state: AppStateStatus): boolean {
  return state === 'active';
}

export type ForegroundLocationTickerRef = MutableRefObject<ReturnType<typeof setInterval> | null>;

export function clearForegroundLocationTicker(ref: ForegroundLocationTickerRef): void {
  if (ref.current !== null) {
    clearInterval(ref.current);
    ref.current = null;
  }
}

export function ensureForegroundLocationTicker(
  ref: ForegroundLocationTickerRef,
  tickMs: number,
  runTick: () => void,
  isTrackingActive: () => boolean,
): void {
  if (!isTrackingActive()) return;
  if (!isAppEligibleForForegroundLocation(AppState.currentState as AppStateStatus)) return;
  if (ref.current !== null) return;

  ref.current = setInterval(() => {
    if (!isTrackingActive()) {
      clearForegroundLocationTicker(ref);
      return;
    }
    if (!isAppEligibleForForegroundLocation(AppState.currentState as AppStateStatus)) {
      clearForegroundLocationTicker(ref);
      return;
    }
    runTick();
  }, tickMs);
}

export type AppStateUnsubscribe = { remove: () => void };

export interface MissionLocationAppStatePipelineOptions {
  foregroundTickerRef: ForegroundLocationTickerRef;
  tickIntervalMs: number;
  flushOutboxSafely: () => Promise<unknown>;
  runForegroundSync: () => Promise<unknown>;
  isTrackingSessionActive: () => boolean;
}

export function attachMissionLocationAppStatePipeline(
  subscriptionRef: MutableRefObject<AppStateUnsubscribe | null>,
  options: MissionLocationAppStatePipelineOptions,
): void {
  if (subscriptionRef.current) return;

  const {
    foregroundTickerRef,
    tickIntervalMs,
    flushOutboxSafely,
    runForegroundSync,
    isTrackingSessionActive,
  } = options;

  subscriptionRef.current = AppState.addEventListener('change', (nextState: AppStateStatus) => {
    if (isAppEligibleForForegroundLocation(nextState)) {
      void flushOutboxSafely();
      void runForegroundSync();
      ensureForegroundLocationTicker(
        foregroundTickerRef,
        tickIntervalMs,
        () => void runForegroundSync(),
        isTrackingSessionActive,
      );
    } else {
      clearForegroundLocationTicker(foregroundTickerRef);
    }
  });
}

export function detachMissionLocationAppStatePipeline(
  subscriptionRef: MutableRefObject<AppStateUnsubscribe | null>,
  foregroundTickerRef: ForegroundLocationTickerRef,
): void {
  clearForegroundLocationTicker(foregroundTickerRef);
  subscriptionRef.current?.remove();
  subscriptionRef.current = null;
}

export function telemetrySyncToLocationSyncResult(result: TelemetrySyncResult): LocationSyncResult {
  if (!result.ok) {
    return errResult({ reason: 'flush_failed' as const });
  }
  if (result.value.delivery === 'uploaded_now') {
    return okResult({ delivery: 'uploaded_now' as const });
  }
  return okResult({ delivery: 'queued_for_retry' as const });
}

export function foregroundSyncMinTimeBetweenMs(intervalMs: number = LOCATION_UPDATE_INTERVAL_MS): number {
  return Math.max(5000, Math.floor(intervalMs / 2));
}

export function isRetryableFirstForegroundSyncReason(reason: LocationSyncFailureReason): boolean {
  return reason === 'position_unavailable' || reason === 'not_foreground' || reason === 'sync_in_flight';
}

export async function runFirstForegroundSyncWithRetries(
  runForegroundSync: () => Promise<LocationSyncResult>,
  setGraceUntil: (epochMs: number) => void,
): Promise<LocationSyncResult> {
  let firstSync = await runForegroundSync();
  if (firstSync.ok) return firstSync;

  const initialReason = firstSync.error.reason;
  if (!isRetryableFirstForegroundSyncReason(initialReason)) return firstSync;

  for (let attempt = 0; attempt < GPS_FIRST_SYNC_RETRY_ATTEMPTS; attempt += 1) {
    setGraceUntil(Date.now() + GPS_FIRST_SYNC_GRACE_EXTEND_MS);
    await delay(GPS_FIRST_SYNC_RETRY_DELAY_MS);
    firstSync = await runForegroundSync();
    if (firstSync.ok) return firstSync;
    if (!isRetryableFirstForegroundSyncReason(firstSync.error.reason)) return firstSync;
  }
  return firstSync;
}

export const BACKGROUND_LOCATION_TASK = BACKGROUND_LOCATION_TASK_NAME;

export { getLocationTelemetryFailureTimestamp as getBackgroundTrackingErrorTimestamp };
export { LOCATION_TELEMETRY_FAILURE_AT_KEY as TRACKING_LAST_BACKGROUND_ERROR_AT_KEY };

export async function stopBackgroundLocationUpdatesAsync(): Promise<void> {
  if (Platform.OS === 'web') return;
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
  if (!hasStarted) return;
  await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => undefined);
}

type BackgroundFlushResult = 'flushed' | 'in_flight' | 'failed';

let backgroundFlushInFlight = false;
let pendingFollowUpFlush = false;

async function flushBackgroundOutboxBestEffort(): Promise<BackgroundFlushResult> {
  for (let chain = 0; chain < GPS_BACKGROUND_OUTBOX_FLUSH_MAX_CHAIN; chain += 1) {
    if (backgroundFlushInFlight) {
      pendingFollowUpFlush = true;
      return 'in_flight';
    }

    backgroundFlushInFlight = true;
    let failed = false;
    try {
      await flushLocationOutboxInBatches(async (batch) => {
        await postLocationsBatch(batch);
      });
    } catch {
      failed = true;
    } finally {
      backgroundFlushInFlight = false;
    }

    if (failed) {
      return 'failed';
    }
    if (!pendingFollowUpFlush) {
      return 'flushed';
    }
    pendingFollowUpFlush = false;
  }
  return 'flushed';
}

if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      await markLocationTelemetryFailure();
      return;
    }
    if (!data) return;

    try {
      const session = await readTelemetrySession();
      if (!session) return;

      const { agentId, syncToServer: syncEnabled } = session;
      const payloads = payloadsFromBackgroundTaskData(agentId, data);
      if (payloads.length === 0) return;

      await mirrorAndEnqueueLocationPayloads(agentId, payloads, syncEnabled);
      let flushResult: BackgroundFlushResult = 'flushed';
      if (syncEnabled) {
        flushResult = await flushBackgroundOutboxBestEffort();
        if (flushResult === 'failed') {
          await markLocationTelemetryFailure();
          return;
        }
      }
      if (!syncEnabled || flushResult === 'flushed') {
        await clearLocationTelemetryFailure();
      }
    } catch {
      await markLocationTelemetryFailure();
    }
  });
}
