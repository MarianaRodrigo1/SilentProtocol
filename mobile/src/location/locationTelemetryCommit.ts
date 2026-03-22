import type * as Location from 'expo-location';
import type { PostLocationPayload } from '../api/contracts';
import { enqueueLocationOutboxMany } from '../services/locationOutbox';
import { appendLocationPayloads } from '../storage/localTelemetryMirror';
import { buildLocationPayload, type LocationPayloadInput } from './locationPayload';

function isExpoLocationObject(item: unknown): item is Location.LocationObject {
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

function readExpoBackgroundTaskLocations(data: unknown): Location.LocationObject[] {
  if (data === null || typeof data !== 'object') return [];
  const locs = (data as { locations?: unknown }).locations;
  if (!Array.isArray(locs)) return [];
  return locs.filter(isExpoLocationObject);
}

function payloadsFromExpoLocationObjects(
  agentId: string,
  locations: Location.LocationObject[],
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

/** Mirror first (deduped by event_id), then outbox — same order as {@link mirrorAndEnqueueLocationPayloads}. */
export async function enqueueLocationSampleWithMirror(
  agentId: string,
  payload: PostLocationPayload,
  enqueue: (p: PostLocationPayload) => Promise<boolean>,
): Promise<{ queued: boolean; mirrorAppended: boolean }> {
  const mirrorAppended = (await appendLocationPayloads(agentId, [payload])) > 0;
  const queued = await enqueue(payload);
  return { queued, mirrorAppended };
}
