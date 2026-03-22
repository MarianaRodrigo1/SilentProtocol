export interface TrackedPosition {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp: number;
}

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
