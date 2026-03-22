import type { PostLocationPayload } from '../api/contracts';
import { stableLocationEventId } from './locationEventId';

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

export function buildLocationPayload(
  agentId: string,
  params: LocationPayloadInput,
): PostLocationPayload {
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
    captured_at: safeIsoFromMs(capturedMs),
  };
}
