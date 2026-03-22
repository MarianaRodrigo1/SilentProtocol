import { useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useRef } from 'react';
import { t } from '../i18n';
import { handleLocationTrackingStartFailure } from './missionTask.telemetry';
import { showMissionObjectiveAlert } from './missionAlerts';
import { startLocationTrackingWithRetries } from './missionTaskExecutors';
import { useBluetoothSync } from './useBluetoothSync';
import { useContactsSync } from './useContactsSync';
import { useConnectivity } from './useConnectivity';
import { useMissionLocationSync } from './useMissionLocationSync';
import { useMissionPermissions } from './useMissionPermissions';
import { useMissionStatusSync } from './useMissionStatusSync';
import { useMissionState } from './useMissionState';
import { useMissionTaskRunner } from './useMissionTaskRunner';
import { useMissionTimers } from './useMissionTimers';

interface MissionEvidence {
  targetPhotoUri: string | null;
  stealthPhotoUri: string | null;
}

interface UseMissionControllerOptions {
  agentId: string;
  agentMode: 'online' | 'offline';
  onMissionComplete: (payload: MissionEvidence) => void;
}

export function useMissionController({
  agentId,
  agentMode,
  onMissionComplete,
}: UseMissionControllerOptions) {
  const { linkQuality } = useConnectivity(agentMode === 'online');
  const shouldSyncToServer = agentMode === 'online';
  const mission = useMissionState();
  const permissions = useMissionPermissions();
  const { clearAllMissionTimers, scheduleDecryptWindow, scheduleMissionComplete } = useMissionTimers();
  const { syncStatusIfNeeded } = useMissionStatusSync({
    agentId,
    enabled: shouldSyncToServer,
  });
  const locationSync = useMissionLocationSync({
    agentId,
    agentMode,
    syncToServer: shouldSyncToServer,
    onLocationSent: mission.notifyLocationSent,
  });
  const contactsSync = useContactsSync(agentId, shouldSyncToServer);
  const bluetoothSync = useBluetoothSync(agentId, shouldSyncToServer);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const evidenceRef = useRef<MissionEvidence>({
    targetPhotoUri: null,
    stealthPhotoUri: null,
  });
  const stopTelemetryPromiseRef = useRef<Promise<void> | null>(null);

  evidenceRef.current = {
    targetPhotoUri: mission.state.targetPhotoUri,
    stealthPhotoUri: mission.state.stealthPhotoUri,
  };

  const stopTelemetry = useCallback(async (): Promise<void> => {
    if (stopTelemetryPromiseRef.current) {
      await stopTelemetryPromiseRef.current;
      return;
    }

    const stopRun = (async () => {
      contactsSync.stopContactsSync();
      await Promise.allSettled([
        contactsSync.flushPendingContacts(),
        bluetoothSync.flushPendingBluetooth(),
      ]);
      await locationSync.stopLocationTracking();
    })();

    stopTelemetryPromiseRef.current = stopRun;
    try {
      await stopRun;
    } finally {
      if (stopTelemetryPromiseRef.current === stopRun) {
        stopTelemetryPromiseRef.current = null;
      }
    }
  }, [bluetoothSync, contactsSync, locationSync]);

  const startMission = useCallback(async (): Promise<void> => {
    const tracking = await startLocationTrackingWithRetries(locationSync.startLocationTracking);
    if (!tracking.ok) {
      if (tracking.error.reason === 'aborted') {
        return;
      }
      handleLocationTrackingStartFailure(permissions, tracking.error, {
        blockedMessage: t.mission.locationPermissionBlockedMsg,
        blockedTitle: t.mission.locationPermissionTitle,
        blockedObjectiveMessage: t.mission.locationPermissionObjectiveMsg,
        backgroundBlockedMessage: t.mission.locationBackgroundPermissionBlockedMsg,
        backgroundBlockedTitle: t.mission.locationBackgroundPermissionTitle,
        backgroundBlockedObjectiveMessage: t.mission.locationBackgroundPermissionObjectiveMsg,
        nativeStartFailedMessage: t.mission.locationNativeStartFailedMsg,
        errorTitle: t.mission.locationError,
        onObjectiveDenied: showMissionObjectiveAlert,
      });
      return;
    }
    mission.startMission();
    await syncStatusIfNeeded('MISSION_ACTIVE');
  }, [locationSync, mission, permissions, syncStatusIfNeeded]);

  const completeMission = useCallback(async (): Promise<void> => {
    await stopTelemetry();
    mission.completeMission();
    await syncStatusIfNeeded('MISSION_COMPLETE');
    scheduleMissionComplete(2000, () => {
      onMissionComplete(evidenceRef.current);
    });
  }, [mission, onMissionComplete, scheduleMissionComplete, stopTelemetry, syncStatusIfNeeded]);

  const onTaskModalDismiss = useCallback(
    (taskNum: number) => {
      if (taskNum < 4 && mission.state.missionPhase === 'active') {
        scheduleDecryptWindow(1800, mission.startDecrypting, mission.stopDecrypting);
      }
    },
    [mission, scheduleDecryptWindow],
  );

  const { isSubmitting, executeCurrentTask } = useMissionTaskRunner({
    syncToServer: shouldSyncToServer,
    currentTask: mission.currentTask,
    showCameraScreen: mission.state.showCameraScreen,
    cameraPermission,
    requestCameraPermission,
    permissions,
    startLocationTracking: locationSync.startLocationTracking,
    syncContactsSnapshot: contactsSync.syncContactsSnapshot,
    startContactsSync: contactsSync.startContactsSync,
    syncBluetoothSnapshot: bluetoothSync.syncBluetoothSnapshot,
    setShowCameraScreen: mission.setCameraScreen,
    markTaskComplete: mission.markTaskComplete,
    onCompleteMission: completeMission,
  });

  const clearAllMissionTimersRef = useRef(clearAllMissionTimers);
  clearAllMissionTimersRef.current = clearAllMissionTimers;
  const stopTelemetryRef = useRef(stopTelemetry);
  stopTelemetryRef.current = stopTelemetry;

  useEffect(() => {
    return () => {
      clearAllMissionTimersRef.current();
      void stopTelemetryRef.current();
    };
  }, []);

  return {
    shouldSyncToServer,
    linkQuality,
    permissions,
    mission,
    isSubmitting,
    startMission,
    executeCurrentTask,
    onTaskModalDismiss,
    onCameraCaptureComplete: mission.setCaptureEvidence,
    onCameraTaskComplete: () => mission.markTaskComplete('camera', 25, 2),
  };
}
