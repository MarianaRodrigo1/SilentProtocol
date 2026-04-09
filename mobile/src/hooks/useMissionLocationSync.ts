import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { type PostLocationPayload, postLocationsBatch } from '../api';
import type { AgentConnectivityMode } from '../features/session/session.types';
import { GPS_LOCATION_CAPTURE_INITIAL_GRACE_MS, LOCATION_UPDATE_INTERVAL_MS } from '../constants';
import {
  enqueueLocationOutbox,
  enqueueLocationOutboxMany,
  flushLocationOutboxInBatches,
} from '../services/locationOutbox';
import {
  attachMissionLocationAppStatePipeline,
  buildLocationPayload,
  detachMissionLocationAppStatePipeline,
  ensureForegroundLocationTicker,
  enqueueLocationSampleWithMirror,
  foregroundSyncMinTimeBetweenMs,
  isAppEligibleForForegroundLocation,
  markLocationTelemetryFailure,
  runFirstForegroundSyncWithRetries,
  telemetrySyncToLocationSyncResult,
  updateTelemetrySessionSyncToServer,
  type AppStateUnsubscribe,
  type LocationPayloadInput,
} from '../locationTelemetry';
import { isNearDuplicateForegroundSample } from '../utils/locationDedupe';
import { errResult, okResult } from '../types/result';
import type { LocationSyncResult, LocationTrackingStartResult } from '../types/missionRuntime';
import { flushTelemetryOutboxToSyncResult } from './telemetryDelivery';
import { useLocationTracking } from './useLocationTracking';
import { useOutboxDelivery } from './useOutboxDelivery';

interface UseMissionLocationSyncOptions {
  agentId: string;
  agentMode: AgentConnectivityMode;
  syncToServer?: boolean;
  onLocationSent?: () => void;
}

export function useMissionLocationSync({
  agentId,
  agentMode,
  syncToServer = true,
  onLocationSent,
}: UseMissionLocationSyncOptions) {
  const shouldQueueForServer = agentMode === 'online';
  const agentIdRef = useRef(agentId);
  agentIdRef.current = agentId;

  const foregroundTickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateSubscriptionRef = useRef<AppStateUnsubscribe | null>(null);
  const syncInFlightRef = useRef(false);
  const trackingStartInFlightRef = useRef(false);
  const trackingSessionActiveRef = useRef(false);
  const locationCaptureGraceUntilRef = useRef(0);
  const lastSentRef = useRef<{ latitude: number; longitude: number; at: number } | null>(null);
  const sessionGenerationRef = useRef(0);
  const priorAgentIdRef = useRef(agentId);

  const {
    captureCurrentPosition,
    ensureLocationPermissions,
    startContinuousTracking,
    stopContinuousTracking,
  } = useLocationTracking();

  const enqueueLocationForMode = useCallback(
    async (payload: PostLocationPayload): Promise<boolean> => {
      if (!shouldQueueForServer) return true;
      return enqueueLocationOutbox(payload);
    },
    [shouldQueueForServer],
  );

  const enqueueManyLocationForMode = useCallback(
    async (payloads: PostLocationPayload[]) => {
      if (payloads.length === 0 || !shouldQueueForServer) return;
      await enqueueLocationOutboxMany(payloads);
    },
    [shouldQueueForServer],
  );

  const flushLocationOutbox = useCallback(
    () =>
      flushLocationOutboxInBatches(async (batch) => {
        await postLocationsBatch(batch);
      }),
    [],
  );

  const { enqueueOne: enqueueLocation, flushSafely: flushOutboxSafely } = useOutboxDelivery<PostLocationPayload>({
    enabled: syncToServer,
    enqueue: enqueueLocationForMode,
    enqueueMany: enqueueManyLocationForMode,
    flush: flushLocationOutbox,
  });

  const wasSyncEnabledRef = useRef(false);
  useEffect(() => {
    if (syncToServer && !wasSyncEnabledRef.current) {
      void flushOutboxSafely();
    }
    wasSyncEnabledRef.current = syncToServer;
  }, [syncToServer, flushOutboxSafely]);

  const teardownForegroundSync = useCallback(() => {
    sessionGenerationRef.current += 1;
    trackingSessionActiveRef.current = false;
    detachMissionLocationAppStatePipeline(appStateSubscriptionRef, foregroundTickerRef);
    syncInFlightRef.current = false;
    lastSentRef.current = null;
  }, []);

  useEffect(() => {
    if (priorAgentIdRef.current === agentId) return;
    priorAgentIdRef.current = agentId;
    teardownForegroundSync();
    void stopContinuousTracking();
  }, [agentId, stopContinuousTracking, teardownForegroundSync]);

  const deliverLocationSafely = useCallback(
    async (
      params: LocationPayloadInput,
    ): Promise<{ result: LocationSyncResult; added: boolean }> => {
      const payload = buildLocationPayload(agentIdRef.current, params);
      const { queued, mirrorAppended } = await enqueueLocationSampleWithMirror(
        agentIdRef.current,
        payload,
        enqueueLocation,
      );
      if (queued || mirrorAppended) {
        lastSentRef.current = {
          latitude: params.latitude,
          longitude: params.longitude,
          at: Date.now(),
        };
      }

      if (!shouldQueueForServer) {
        if (queued) {
          onLocationSent?.();
        }
        return { result: okResult({ delivery: 'uploaded_now' }), added: queued };
      }

      const flushResult = await flushTelemetryOutboxToSyncResult(flushOutboxSafely);
      const result = telemetrySyncToLocationSyncResult(flushResult);

      if (
        queued &&
        result.ok &&
        (result.value.delivery === 'uploaded_now' || result.value.delivery === 'queued_for_retry')
      ) {
        onLocationSent?.();
      }

      return { result, added: queued };
    },
    [enqueueLocation, flushOutboxSafely, onLocationSent, shouldQueueForServer],
  );

  const runForegroundSync = useCallback(async (): Promise<LocationSyncResult> => {
    const appState = AppState.currentState;
    const graceActive = Date.now() < locationCaptureGraceUntilRef.current;
    if (!isAppEligibleForForegroundLocation(appState) && !graceActive) {
      return errResult({ reason: 'not_foreground' as const });
    }
    if (syncInFlightRef.current) return errResult({ reason: 'sync_in_flight' as const });
    syncInFlightRef.current = true;
    try {
      await flushOutboxSafely();
      const position = await captureCurrentPosition();
      if (!position) return errResult({ reason: 'position_unavailable' as const });
      const lastSent = lastSentRef.current;
      const minTimeBetweenMs = foregroundSyncMinTimeBetweenMs(LOCATION_UPDATE_INTERVAL_MS);
      if (
        isNearDuplicateForegroundSample({
          last: lastSent,
          next: {
            latitude: position.latitude,
            longitude: position.longitude,
            accuracy: position.accuracy,
          },
          minTimeBetweenMs,
        })
      ) {
        return errResult({ reason: 'duplicate' as const });
      }
      const { result } = await deliverLocationSafely({
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        source: 'foreground_sync',
        capturedAt: position.timestamp,
      });
      if (result.ok) {
        if (result.value.delivery === 'uploaded_now') {
          return okResult({ delivery: 'uploaded_now' });
        }
        return okResult({ delivery: 'queued_for_retry' });
      }
      return result;
    } finally {
      syncInFlightRef.current = false;
    }
  }, [captureCurrentPosition, deliverLocationSafely, flushOutboxSafely]);

  const runForegroundSyncRef = useRef(runForegroundSync);
  runForegroundSyncRef.current = runForegroundSync;

  const runForegroundSyncSafe = useCallback(
    () =>
      runForegroundSyncRef.current().catch(() => {
        void markLocationTelemetryFailure();
      }),
    [],
  );

  const attachAppStatePipeline = useCallback(() => {
    attachMissionLocationAppStatePipeline(appStateSubscriptionRef, {
      foregroundTickerRef,
      tickIntervalMs: LOCATION_UPDATE_INTERVAL_MS,
      flushOutboxSafely,
      runForegroundSync: runForegroundSyncSafe,
      isTrackingSessionActive: () => trackingSessionActiveRef.current,
    });
  }, [flushOutboxSafely, runForegroundSyncSafe]);

  const startLocationTracking = useCallback(async (): Promise<LocationTrackingStartResult> => {
    if (trackingStartInFlightRef.current) {
      return errResult({ reason: 'sync_in_flight' as const, canAskAgain: true });
    }
    trackingStartInFlightRef.current = true;
    const generationAtStart = sessionGenerationRef.current;

    const aborted = (): LocationTrackingStartResult =>
      errResult({ reason: 'aborted' as const, canAskAgain: false });

    const ifAborted = (): LocationTrackingStartResult | null =>
      sessionGenerationRef.current !== generationAtStart ? aborted() : null;

    try {
      const permission = await ensureLocationPermissions();
      let cancel = ifAborted();
      if (cancel) return cancel;

      if (!permission.foregroundGranted) {
        return errResult({
          reason: 'permission_denied' as const,
          canAskAgain: permission.canAskAgainForeground,
        });
      }
      if (Platform.OS !== 'web' && !permission.backgroundGranted) {
        return errResult({
          reason: 'background_permission_denied' as const,
          canAskAgain: permission.canAskAgainBackground,
        });
      }

      locationCaptureGraceUntilRef.current = Date.now() + GPS_LOCATION_CAPTURE_INITIAL_GRACE_MS;

      if (trackingSessionActiveRef.current) {
        const refreshed = await startContinuousTracking(agentIdRef.current, shouldQueueForServer, {
          skipPermissionCheck: true,
        });
        cancel = ifAborted();
        if (cancel) return cancel;

        if (!refreshed.ok) {
          trackingSessionActiveRef.current = false;
          teardownForegroundSync();
          return errResult({
            reason: 'native_start_failed' as const,
            canAskAgain: true,
            detail: refreshed.detail ?? refreshed.code,
          });
        }
        attachAppStatePipeline();
        ensureForegroundLocationTicker(
          foregroundTickerRef,
          LOCATION_UPDATE_INTERVAL_MS,
          () => {
            void runForegroundSyncSafe();
          },
          () => trackingSessionActiveRef.current,
        );
        const firstSync = await runForegroundSync();
        cancel = ifAborted();
        if (cancel) return cancel;
        return okResult({ firstSync });
      }

      const nativeStart = await startContinuousTracking(agentIdRef.current, shouldQueueForServer, {
        skipPermissionCheck: true,
      });
      cancel = ifAborted();
      if (cancel) return cancel;

      if (!nativeStart.ok) {
        const detail =
          nativeStart.detail ??
          (nativeStart.code !== 'native_start_failed' ? nativeStart.code : undefined);
        return errResult({
          reason: 'native_start_failed' as const,
          canAskAgain:
            nativeStart.code === 'background_denied'
              ? permission.canAskAgainBackground
              : permission.canAskAgainForeground,
          detail,
        });
      }

      attachAppStatePipeline();
      void flushOutboxSafely();
      trackingSessionActiveRef.current = true;
      ensureForegroundLocationTicker(
        foregroundTickerRef,
        LOCATION_UPDATE_INTERVAL_MS,
        () => {
          void runForegroundSyncSafe();
        },
        () => trackingSessionActiveRef.current,
      );

      const firstSync = await runFirstForegroundSyncWithRetries(
        runForegroundSync,
        (epochMs) => {
          locationCaptureGraceUntilRef.current = epochMs;
        },
      );
      cancel = ifAborted();
      if (cancel) return cancel;

      return okResult({ firstSync });
    } finally {
      trackingStartInFlightRef.current = false;
    }
  }, [
    attachAppStatePipeline,
    ensureLocationPermissions,
    flushOutboxSafely,
    runForegroundSync,
    runForegroundSyncSafe,
    startContinuousTracking,
    shouldQueueForServer,
    teardownForegroundSync,
  ]);

  const stopLocationTracking = useCallback(async () => {
    teardownForegroundSync();
    await stopContinuousTracking();
    await flushOutboxSafely();
  }, [flushOutboxSafely, stopContinuousTracking, teardownForegroundSync]);

  useEffect(() => {
    void updateTelemetrySessionSyncToServer(shouldQueueForServer).catch(() => undefined);
  }, [shouldQueueForServer]);

  return useMemo(
    () => ({
      startLocationTracking,
      stopLocationTracking,
    }),
    [startLocationTracking, stopLocationTracking],
  );
}
