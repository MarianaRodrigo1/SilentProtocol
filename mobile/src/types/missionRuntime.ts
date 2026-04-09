import type { PermissionResponse } from 'expo-camera';
import type { TaskType } from '../features/mission/domain/missionTasks';
import type { Result } from './result';

export type PermissionFlowResult = 'granted' | 'denied' | 'blocked';

export type TelemetryDeliveryState = 'uploaded_now' | 'queued_for_retry' | 'failed';

export type TelemetrySyncResult = Result<
  { delivery: Exclude<TelemetryDeliveryState, 'failed'> },
  { reason: 'permission_denied' | 'delivery_failed'; permission: PermissionFlowResult }
>;

export type ContactsSyncResult = TelemetrySyncResult;
export type BluetoothSyncResult = TelemetrySyncResult;

export type LocationSyncFailureReason =
  | 'not_foreground'
  | 'sync_in_flight'
  | 'position_unavailable'
  | 'duplicate'
  | 'flush_failed';

export type LocationSyncResult = Result<
  { delivery: 'uploaded_now' | 'queued_for_retry' },
  { reason: LocationSyncFailureReason }
>;

export type LocationTrackingStartFailure =
  | { reason: 'sync_in_flight'; canAskAgain: true }
  | { reason: 'aborted'; canAskAgain: false }
  | { reason: 'permission_denied'; canAskAgain: boolean }
  | { reason: 'background_permission_denied'; canAskAgain: boolean }
  | { reason: 'native_start_failed'; canAskAgain: boolean; detail?: string };

export type LocationTrackingStartResult = Result<{ firstSync: LocationSyncResult }, LocationTrackingStartFailure>;

export interface MissionPermissionsApi {
  showError: (
    message: string,
    buttons?: { text: string; onPress?: () => void }[],
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
