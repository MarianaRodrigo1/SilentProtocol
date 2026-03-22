import type { PostLocationPayload } from '../api/contracts';
import { LOCATION_TELEMETRY_DEDUPE_WINDOW_MS } from './locationTelemetryConfig';
import { haversineDistanceMeters } from '../utils/geo';

const LOCATION_DEDUPE_MIN_DISTANCE_M = 8;
const LOCATION_DEDUPE_MAX_DISTANCE_M = 100;

function locationDedupeDistanceThresholdMeters(accuracyMeters?: number | null): number {
  const a =
    typeof accuracyMeters === 'number' && Number.isFinite(accuracyMeters) && accuracyMeters > 0
      ? accuracyMeters
      : 25;
  return Math.max(LOCATION_DEDUPE_MIN_DISTANCE_M, Math.min(LOCATION_DEDUPE_MAX_DISTANCE_M, a * 1.5));
}

function locationCapturedAtMs(value?: string): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function coordinatesWithinDedupeDistanceMeters(
  a: { latitude: number; longitude: number; accuracy_meters?: number | null },
  b: { latitude: number; longitude: number; accuracy_meters?: number | null },
  accuracyMode: 'max' | 'latest',
): boolean {
  const acc =
    accuracyMode === 'latest'
      ? b.accuracy_meters ?? null
      : typeof a.accuracy_meters === 'number' && typeof b.accuracy_meters === 'number'
        ? Math.max(a.accuracy_meters, b.accuracy_meters)
        : a.accuracy_meters ?? b.accuracy_meters ?? null;
  const threshold = locationDedupeDistanceThresholdMeters(acc);
  const d = haversineDistanceMeters(
    { latitude: a.latitude, longitude: a.longitude },
    { latitude: b.latitude, longitude: b.longitude },
  );
  return d < threshold;
}

export function areRedundantLocationOutboxEntries(a: PostLocationPayload, b: PostLocationPayload): boolean {
  if (a.agent_id !== b.agent_id) return false;
  if (a.event_id === b.event_id) return true;
  if ((a.source ?? null) !== (b.source ?? null)) return false;

  const aMs = locationCapturedAtMs(a.captured_at);
  const bMs = locationCapturedAtMs(b.captured_at);
  if (aMs === null || bMs === null) {
    return (
      a.latitude === b.latitude &&
      a.longitude === b.longitude &&
      (a.accuracy_meters ?? null) === (b.accuracy_meters ?? null)
    );
  }

  if (Math.abs(aMs - bMs) > LOCATION_TELEMETRY_DEDUPE_WINDOW_MS) return false;

  return coordinatesWithinDedupeDistanceMeters(
    { latitude: a.latitude, longitude: a.longitude, accuracy_meters: a.accuracy_meters },
    { latitude: b.latitude, longitude: b.longitude, accuracy_meters: b.accuracy_meters },
    'max',
  );
}

export function isNearDuplicateForegroundSample(params: {
  last: { latitude: number; longitude: number; at: number } | null;
  next: { latitude: number; longitude: number; accuracy?: number | null };
  minTimeBetweenMs: number;
}): boolean {
  const { last, next, minTimeBetweenMs } = params;
  if (!last) return false;
  if (Date.now() - last.at >= minTimeBetweenMs) return false;
  return coordinatesWithinDedupeDistanceMeters(
    { latitude: last.latitude, longitude: last.longitude },
    { latitude: next.latitude, longitude: next.longitude, accuracy_meters: next.accuracy },
    'latest',
  );
}
