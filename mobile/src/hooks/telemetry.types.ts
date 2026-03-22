import type { PermissionFlowResult } from './permission.types';
import type { Result } from '../types/result';

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
