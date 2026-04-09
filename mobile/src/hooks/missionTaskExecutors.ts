import { Platform } from 'react-native';
import { LOCATION_START_SYNC_IN_FLIGHT_DELAY_MS, LOCATION_START_SYNC_IN_FLIGHT_RETRIES } from '../constants';
import type { TaskType } from '../features/mission/domain/missionTasks';
import { t } from '../i18n';
import { delay } from '../utils/promiseUtils';
import {
  handleLocationTrackingStartFailure,
  locationTrackingFailureUi,
  runTelemetryTask,
} from './missionTask.telemetry';
import type { MissionTaskExecutorDeps } from '../types/missionRuntime';

export async function startLocationTrackingWithRetries(
  startLocationTracking: MissionTaskExecutorDeps['startLocationTracking'],
) {
  let tracking = await startLocationTracking();
  for (let attempt = 0; attempt < LOCATION_START_SYNC_IN_FLIGHT_RETRIES; attempt += 1) {
    if (tracking.ok || tracking.error.reason !== 'sync_in_flight') break;
    await delay(LOCATION_START_SYNC_IN_FLIGHT_DELAY_MS);
    tracking = await startLocationTracking();
  }
  return tracking;
}

export function executeMissionTask(deps: MissionTaskExecutorDeps): void {
  const {
    syncToServer,
    currentTask,
    showCameraScreen,
    cameraPermission,
    requestCameraPermission,
    permissions,
    startLocationTracking,
    syncContactsSnapshot,
    startContactsSync,
    syncBluetoothSnapshot,
    setShowCameraScreen,
    markTaskComplete,
    onCompleteMission,
    runWithSubmittingGuard,
    showObjectiveAlert,
  } = deps;

  const completeLocationTask = async () => {
    if (currentTask.completed) return;
    await runWithSubmittingGuard(async () => {
      const tracking = await startLocationTrackingWithRetries(startLocationTracking);
      if (!tracking.ok) {
        handleLocationTrackingStartFailure(
          permissions,
          tracking.error,
          locationTrackingFailureUi(showObjectiveAlert),
        );
        return;
      }

      const firstSync = tracking.value.firstSync;
      const firstSyncFailureReason = firstSync.ok ? undefined : firstSync.error.reason;

      const mayAdvanceWithoutSuccessfulSync =
        firstSyncFailureReason === 'duplicate' || firstSyncFailureReason === 'sync_in_flight';

      if (!firstSync.ok && !mayAdvanceWithoutSuccessfulSync) {
        if (firstSyncFailureReason === 'position_unavailable') {
          permissions.showError(
            t.mission.locationGpsUnavailableDescription,
            [{ text: t.onboarding.continueBtn }],
            t.mission.locationGpsUnavailableTitle,
          );
        } else if (firstSyncFailureReason === 'flush_failed' && !syncToServer) {
          markTaskComplete('location', 25, 1);
        } else if (firstSyncFailureReason === 'flush_failed') {
          permissions.showError(
            t.mission.locationTransmitFailedDescription,
            [{ text: t.onboarding.continueBtn }],
            t.mission.locationError,
          );
        } else {
          permissions.showError(
            t.mission.locationErrorMsg,
            [{ text: t.onboarding.continueBtn }],
            t.mission.locationError,
          );
        }
        return;
      }

      markTaskComplete('location', 25, 1);
    }, t.mission.taskErrorMsg, t.mission.locationError);
  };

  const completeCameraTask = async () => {
    if (currentTask.completed || showCameraScreen) return;
    await runWithSubmittingGuard(async () => {
      if (!cameraPermission?.granted) {
        if (cameraPermission && cameraPermission.canAskAgain === false && Platform.OS !== 'web') {
          permissions.handlePermissionDenied(false, t.mission.permissionBlockedMsg);
          return;
        }
        const result = await requestCameraPermission();
        if (!result.granted) {
          permissions.handlePermissionDenied(
            result.canAskAgain ?? true,
            t.mission.permissionBlockedMsg,
            () => showObjectiveAlert(t.mission.cameraPermissionTitle, t.mission.cameraPermissionObjectiveMsg),
          );
          return;
        }
      }
      setShowCameraScreen(true);
    }, t.mission.cameraErrorMsg, t.mission.cameraPermissionTitle);
  };

  const completeContactsTask = async () => {
    if (currentTask.completed) return;
    await runTelemetryTask(permissions, runWithSubmittingGuard, {
      sync: () => syncContactsSnapshot({ requestPermission: true }),
      blockedMessage: t.mission.contactsPermissionBlockedMsg,
      onDenied: () => showObjectiveAlert(t.mission.contactsPermissionTitle, t.mission.contactsPermissionObjectiveMsg),
      errorMessage: t.mission.contactsFailedDescription,
      errorTitle: t.mission.contactsPermissionTitle,
      markComplete: () => {
        markTaskComplete('contacts', 25, 3);
      },
      afterSuccess: () => {
        startContactsSync();
      },
      guardErrorMessage: t.mission.contactsErrorMsg,
      guardErrorTitle: t.mission.contactsPermissionTitle,
    });
  };

  const completeBluetoothTask = async () => {
    if (currentTask.completed) return;
    await runTelemetryTask(permissions, runWithSubmittingGuard, {
      sync: () => syncBluetoothSnapshot({ requestPermission: true }),
      blockedMessage: t.mission.bluetoothPermissionBlockedMsg,
      onDenied: () =>
        showObjectiveAlert(
          t.mission.bluetoothPermissionTitleObjective,
          t.mission.bluetoothPermissionObjectiveMsg,
        ),
      errorMessage: t.mission.bluetoothFailedDescription,
      errorTitle: t.mission.bluetoothPermissionTitleObjective,
      markComplete: () => {
        markTaskComplete('bluetooth', 50, 4);
      },
      afterSuccess: async () => {
        await onCompleteMission();
      },
      guardErrorMessage: t.mission.syncErrorMsg,
      guardErrorTitle: t.mission.bluetoothPermissionTitleObjective,
    });
  };
  const executors: Record<TaskType, () => Promise<void>> = {
    location: completeLocationTask,
    camera: completeCameraTask,
    contacts: completeContactsTask,
    bluetooth: completeBluetoothTask,
  };

  const execute = executors[currentTask.id];
  if (execute) {
    void execute();
  }
}
