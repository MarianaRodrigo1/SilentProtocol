import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { postLocationsBatch } from '../api/intelligence';
import { flushLocationOutboxInBatches } from '../services/locationOutbox';
import {
  clearLocationTelemetryFailure,
  markLocationTelemetryFailure,
} from './locationTelemetryFailureMarker';
import {
  mirrorAndEnqueueLocationPayloads,
  payloadsFromBackgroundTaskData,
} from './locationTelemetryCommit';
import { readTelemetrySession } from './telemetrySessionStorage';

export const BACKGROUND_LOCATION_TASK = 'silent-protocol-background-location';

let backgroundFlushInFlight = false;
let pendingFollowUpFlush = false;

export { getLocationTelemetryFailureTimestamp as getBackgroundTrackingErrorTimestamp } from './locationTelemetryFailureMarker';
export { LOCATION_TELEMETRY_FAILURE_AT_KEY as TRACKING_LAST_BACKGROUND_ERROR_AT_KEY } from './locationTelemetryFailureMarker';

export async function stopBackgroundLocationUpdatesAsync(): Promise<void> {
  if (Platform.OS === 'web') return;
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(
    () => false,
  );
  if (!hasStarted) return;
  await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => undefined);
}

type BackgroundFlushResult = 'flushed' | 'in_flight' | 'failed';

const MAX_BACKGROUND_FLUSH_CHAIN = 12;

async function flushBackgroundOutboxBestEffort(): Promise<BackgroundFlushResult> {
  for (let chain = 0; chain < MAX_BACKGROUND_FLUSH_CHAIN; chain += 1) {
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
