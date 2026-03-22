import AsyncStorage from '@react-native-async-storage/async-storage';
import { runBestEffort } from '../utils/async';

/** Shared with legacy key name so existing installs keep debriefing / reset behavior. */
export const LOCATION_TELEMETRY_FAILURE_AT_KEY = 'silent_protocol_tracking_last_background_error_at';

export async function markLocationTelemetryFailure(): Promise<void> {
  await runBestEffort(() =>
    AsyncStorage.setItem(LOCATION_TELEMETRY_FAILURE_AT_KEY, String(Date.now())),
  );
}

export async function clearLocationTelemetryFailure(): Promise<void> {
  await runBestEffort(() => AsyncStorage.removeItem(LOCATION_TELEMETRY_FAILURE_AT_KEY));
}

export async function getLocationTelemetryFailureTimestamp(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(LOCATION_TELEMETRY_FAILURE_AT_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}
