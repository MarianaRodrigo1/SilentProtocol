import { useCallback, useRef, useState } from 'react';
import { showMissionObjectiveAlert } from './missionAlerts';
import { executeMissionTask } from './missionTaskExecutors';
import type { MissionTaskExecutorDeps } from './missionTask.types';

type UseMissionTaskRunnerOptions = Omit<MissionTaskExecutorDeps, 'runWithSubmittingGuard' | 'showObjectiveAlert'>;

export function useMissionTaskRunner({
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
}: UseMissionTaskRunnerOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const runWithSubmittingGuard = useCallback(
    async (fn: () => Promise<void>, errorMsg: string, errorTitle?: string) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setIsSubmitting(true);
      try {
        await fn();
      } catch (error) {
        const detail = error instanceof Error && error.message ? ` (${error.message})` : '';
        permissions.showError(`${errorMsg}${detail}`, undefined, errorTitle);
      } finally {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [permissions],
  );

  const executeCurrentTask = useCallback(
    (): void =>
      executeMissionTask({
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
        showObjectiveAlert: showMissionObjectiveAlert,
      }),
    [
      syncToServer,
      cameraPermission,
      currentTask,
      markTaskComplete,
      onCompleteMission,
      permissions,
      requestCameraPermission,
      runWithSubmittingGuard,
      setShowCameraScreen,
      showCameraScreen,
      startContactsSync,
      startLocationTracking,
      syncBluetoothSnapshot,
      syncContactsSnapshot,
    ],
  );

  return {
    isSubmitting,
    executeCurrentTask,
  };
}
