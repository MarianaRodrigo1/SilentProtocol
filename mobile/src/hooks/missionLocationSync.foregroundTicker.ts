import type { MutableRefObject } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { isAppEligibleForForegroundLocation } from './appLocationState';

export type ForegroundLocationTickerRef = MutableRefObject<ReturnType<typeof setInterval> | null>;

export function clearForegroundLocationTicker(ref: ForegroundLocationTickerRef): void {
  if (ref.current !== null) {
    clearInterval(ref.current);
    ref.current = null;
  }
}

/**
 * Starts a JS interval for foreground GPS samples only while the app is active.
 * Background / locked-device updates are handled by the native Expo location task.
 */
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
