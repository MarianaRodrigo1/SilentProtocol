import { useCallback } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import {
  BACKGROUND_DISTANCE_INTERVAL_METERS,
  LOCATION_UPDATE_INTERVAL_MS,
} from '../constants';
import {
  BACKGROUND_LOCATION_TASK,
  clearTelemetrySession,
  persistTelemetrySession,
  stopBackgroundLocationUpdatesAsync,
} from '../locationTelemetry';
import { captureCurrentTrackedPosition, type TrackedPosition } from './locationCapture';
import { runBestEffort } from '../utils/promiseUtils';

export type { TrackedPosition } from './locationCapture';

export interface LocationPermissionSnapshot {
  foregroundGranted: boolean;
  backgroundGranted: boolean;
  canAskAgainForeground: boolean;
  canAskAgainBackground: boolean;
}

export type StartContinuousTrackingFailureCode =
  | 'foreground_denied'
  | 'background_denied'
  | 'storage_failed'
  | 'native_start_failed'
  | 'unknown';

export type StartContinuousTrackingResult =
  | { ok: true; foregroundOnly?: boolean }
  | { ok: false; code: StartContinuousTrackingFailureCode; detail?: string };

function formatErrorDetail(error: unknown): string | undefined {
  if (error instanceof Error && error.message.trim()) {
    const m = error.message.trim();
    return m.length > 180 ? `${m.slice(0, 177)}…` : m;
  }
  if (typeof error === 'string' && error.trim()) {
    const m = error.trim();
    return m.length > 180 ? `${m.slice(0, 177)}…` : m;
  }
  return undefined;
}

export function useLocationTracking() {
  const ensureLocationPermissions = useCallback(async (): Promise<LocationPermissionSnapshot> => {
    try {
      if (Platform.OS === 'web') {
        try {
          let fg = await Location.getForegroundPermissionsAsync();
          if (fg.status !== 'granted') {
            fg = await Location.requestForegroundPermissionsAsync();
          }
          const granted = fg.status === 'granted';
          return {
            foregroundGranted: granted,
            backgroundGranted: granted,
            canAskAgainForeground: fg.canAskAgain ?? true,
            canAskAgainBackground: true,
          };
        } catch {
          return {
            foregroundGranted: false,
            backgroundGranted: false,
            canAskAgainForeground: true,
            canAskAgainBackground: true,
          };
        }
      }

      let fg = await Location.getForegroundPermissionsAsync();
      if (fg.status !== 'granted') {
        fg = await Location.requestForegroundPermissionsAsync();
      }
      if (fg.status !== 'granted') {
        return {
          foregroundGranted: false,
          backgroundGranted: false,
          canAskAgainForeground: fg.canAskAgain ?? true,
          canAskAgainBackground: true,
        };
      }

      if (Platform.OS === 'android') {
        try {
          await Location.enableNetworkProviderAsync();
        } catch {}
      }

      let bgCanAskAgain = true;
      let backgroundGranted = false;
      try {
        const currentBg = await Location.getBackgroundPermissionsAsync();
        backgroundGranted = currentBg.status === 'granted';
        bgCanAskAgain = currentBg.canAskAgain ?? true;
        if (!backgroundGranted) {
          const requestedBg = await Location.requestBackgroundPermissionsAsync();
          backgroundGranted = requestedBg.status === 'granted';
          bgCanAskAgain = requestedBg.canAskAgain ?? true;
        }
      } catch {
        backgroundGranted = false;
      }

      return {
        foregroundGranted: true,
        backgroundGranted,
        canAskAgainForeground: fg.canAskAgain ?? true,
        canAskAgainBackground: bgCanAskAgain,
      };
    } catch {
      return {
        foregroundGranted: false,
        backgroundGranted: false,
        canAskAgainForeground: true,
        canAskAgainBackground: true,
      };
    }
  }, []);

  const startContinuousTracking = useCallback(
    async (
      agentId: string,
      syncToServer = true,
      options: { skipPermissionCheck?: boolean } = {},
    ): Promise<StartContinuousTrackingResult> => {
      try {
        if (!options.skipPermissionCheck) {
          const permission = await ensureLocationPermissions();
          if (!permission.foregroundGranted) {
            return { ok: false, code: 'foreground_denied' };
          }
          if (Platform.OS !== 'web' && !permission.backgroundGranted) {
            return { ok: false, code: 'background_denied' };
          }
        }

        try {
          await persistTelemetrySession(agentId, syncToServer);
        } catch (storageError: unknown) {
          return { ok: false, code: 'storage_failed', detail: formatErrorDetail(storageError) };
        }

        if (Platform.OS === 'web') {
          return { ok: true, foregroundOnly: true };
        }

        const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        if (hasStarted) {
          return { ok: true };
        }

        const backgroundPermission = await Location.getBackgroundPermissionsAsync();
        if (backgroundPermission.status !== 'granted') {
          return { ok: false, code: 'background_denied' };
        }

        try {
          await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: LOCATION_UPDATE_INTERVAL_MS,
            distanceInterval: BACKGROUND_DISTANCE_INTERVAL_METERS,
            pausesUpdatesAutomatically: false,
            showsBackgroundLocationIndicator: Platform.OS === 'ios',
            foregroundService: {
              notificationTitle: 'Signal Optimization Active',
              notificationBody: 'Calibrating route signal quality in the background.',
              killServiceOnDestroy: false,
            },
          });
        } catch (backgroundError: unknown) {
          return {
            ok: false,
            code: 'native_start_failed',
            detail: formatErrorDetail(backgroundError),
          };
        }
        return { ok: true };
      } catch (error: unknown) {
        return { ok: false, code: 'unknown', detail: formatErrorDetail(error) };
      }
    },
    [ensureLocationPermissions],
  );

  const stopContinuousTracking = useCallback(async (): Promise<void> => {
    await runBestEffort(() => stopBackgroundLocationUpdatesAsync());
    await runBestEffort(() => clearTelemetrySession());
  }, []);

  const captureCurrentPosition = useCallback(
    async (): Promise<TrackedPosition | null> => captureCurrentTrackedPosition(),
    [],
  );

  return {
    captureCurrentPosition,
    ensureLocationPermissions,
    startContinuousTracking,
    stopContinuousTracking,
  };
}
