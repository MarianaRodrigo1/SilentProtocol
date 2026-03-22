import type { MutableRefObject } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { isAppEligibleForForegroundLocation } from './appLocationState';
import {
  clearForegroundLocationTicker,
  ensureForegroundLocationTicker,
  type ForegroundLocationTickerRef,
} from './missionLocationSync.foregroundTicker';

export type AppStateUnsubscribe = { remove: () => void };

export interface MissionLocationAppStatePipelineOptions {
  foregroundTickerRef: ForegroundLocationTickerRef;
  tickIntervalMs: number;
  flushOutboxSafely: () => Promise<unknown>;
  runForegroundSync: () => Promise<unknown>;
  isTrackingSessionActive: () => boolean;
}

/**
 * Single AppState subscription for mission location: flush + sample on resume,
 * foreground interval only while active, no interval while backgrounded.
 */
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
