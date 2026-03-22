import type { PermissionResponse } from 'expo-camera';
import type { TaskType } from '../features/mission/domain/missionTasks';
import type { PermissionFlowResult } from './permission.types';
import type {
  BluetoothSyncResult,
  ContactsSyncResult,
  LocationTrackingStartResult,
} from './telemetry.types';

export interface MissionPermissionsApi {
  showError: (
    message: string,
    buttons?: Array<{ text: string; onPress?: () => void }>,
    title?: string,
  ) => void;
  handlePermissionDenied: (
    canAskAgain: boolean,
    blockedMessage: string,
    onDenied?: () => void,
  ) => void;
  handlePermissionFlowResult: (
    permission: PermissionFlowResult,
    blockedMessage: string,
    onDenied?: () => void,
  ) => boolean;
}

export interface MissionTaskExecutorDeps {
  syncToServer: boolean;
  currentTask: { id: TaskType; completed: boolean };
  showCameraScreen: boolean;
  cameraPermission: PermissionResponse | null;
  requestCameraPermission: () => Promise<PermissionResponse>;
  permissions: MissionPermissionsApi;
  startLocationTracking: () => Promise<LocationTrackingStartResult>;
  syncContactsSnapshot: (options?: { requestPermission?: boolean }) => Promise<ContactsSyncResult>;
  startContactsSync: () => void;
  syncBluetoothSnapshot: (options?: { requestPermission?: boolean }) => Promise<BluetoothSyncResult>;
  setShowCameraScreen: (value: boolean) => void;
  markTaskComplete: (taskId: TaskType, stealthIncrement: number, taskNumber: number) => void;
  onCompleteMission: () => Promise<void>;
  runWithSubmittingGuard: (fn: () => Promise<void>, errorMsg: string, errorTitle?: string) => Promise<void>;
  showObjectiveAlert: (title: string, message: string) => void;
}
