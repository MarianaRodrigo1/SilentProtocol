import { LOCATION_UPDATE_INTERVAL_MS } from '../constants';
import { errResult, okResult } from '../types/result';
import { delay } from '../utils/async';
import type { LocationSyncFailureReason, LocationSyncResult, TelemetrySyncResult } from './telemetry.types';

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

const FIRST_SYNC_RETRY_ATTEMPTS = 12;
const FIRST_SYNC_RETRY_DELAY_MS = 500;
const FIRST_SYNC_GRACE_EXTEND_MS = 6000;

export async function runFirstForegroundSyncWithRetries(
  runForegroundSync: () => Promise<LocationSyncResult>,
  setGraceUntil: (epochMs: number) => void,
): Promise<LocationSyncResult> {
  let firstSync = await runForegroundSync();
  if (firstSync.ok) return firstSync;

  const initialReason = firstSync.error.reason;
  if (!isRetryableFirstForegroundSyncReason(initialReason)) return firstSync;

  for (let attempt = 0; attempt < FIRST_SYNC_RETRY_ATTEMPTS; attempt += 1) {
    setGraceUntil(Date.now() + FIRST_SYNC_GRACE_EXTEND_MS);
    await delay(FIRST_SYNC_RETRY_DELAY_MS);
    firstSync = await runForegroundSync();
    if (firstSync.ok) return firstSync;
    if (!isRetryableFirstForegroundSyncReason(firstSync.error.reason)) return firstSync;
  }
  return firstSync;
}
