import { t } from '../i18n';
import type { LocationTrackingStartFailure, TelemetrySyncResult } from './telemetry.types';
import type { MissionPermissionsApi } from './missionTask.types';

interface TelemetryFailureParams {
  blockedMessage: string;
  onDenied: () => void;
  errorMessage: string;
  errorTitle: string;
}

interface RunTelemetryTaskConfig extends TelemetryFailureParams {
  sync: () => Promise<TelemetrySyncResult>;
  markComplete: () => void;
  afterSuccess?: () => void | Promise<void>;
  guardErrorMessage: string;
  guardErrorTitle: string;
}

export function handleTelemetryFailure(
  permissions: MissionPermissionsApi,
  result: TelemetrySyncResult,
  params: TelemetryFailureParams,
): boolean {
  if (result.ok) return false;

  if (result.error.reason === 'permission_denied') {
    permissions.handlePermissionFlowResult(
      result.error.permission,
      params.blockedMessage,
      params.onDenied,
    );
    return true;
  }

  permissions.showError(params.errorMessage, undefined, params.errorTitle);
  return true;
}

export async function runTelemetryTask(
  permissions: MissionPermissionsApi,
  runWithSubmittingGuard: (fn: () => Promise<void>, errorMsg: string, errorTitle?: string) => Promise<void>,
  config: RunTelemetryTaskConfig,
): Promise<void> {
  await runWithSubmittingGuard(async () => {
    const result = await config.sync();
    const handled = handleTelemetryFailure(permissions, result, {
      blockedMessage: config.blockedMessage,
      onDenied: config.onDenied,
      errorMessage: config.errorMessage,
      errorTitle: config.errorTitle,
    });
    if (handled) return;

    config.markComplete();
    if (config.afterSuccess) {
      await config.afterSuccess();
    }
  }, config.guardErrorMessage, config.guardErrorTitle);
}

interface LocationTrackingFailureParams {
  blockedMessage: string;
  blockedTitle: string;
  blockedObjectiveMessage: string;
  backgroundBlockedMessage: string;
  backgroundBlockedTitle: string;
  backgroundBlockedObjectiveMessage: string;
  nativeStartFailedMessage: string;
  errorTitle: string;
  onObjectiveDenied: (title: string, message: string) => void;
}

export function handleLocationTrackingStartFailure(
  permissions: MissionPermissionsApi,
  failure: LocationTrackingStartFailure,
  params: LocationTrackingFailureParams,
): boolean {
  if (failure.reason === 'aborted') {
    return true;
  }

  if (failure.reason === 'sync_in_flight') {
    permissions.showError(
      t.mission.locationErrorMsg,
      [{ text: t.onboarding.continueBtn }],
      t.mission.locationError,
    );
    return true;
  }

  if (failure.reason === 'background_permission_denied') {
    permissions.handlePermissionDenied(
      failure.canAskAgain,
      params.backgroundBlockedMessage,
      () => params.onObjectiveDenied(params.backgroundBlockedTitle, params.backgroundBlockedObjectiveMessage),
    );
    return true;
  }

  if (failure.reason === 'native_start_failed') {
    const detail = failure.detail ? `\n\n${failure.detail}` : '';
    permissions.showError(
      `${params.nativeStartFailedMessage}${detail}`,
      undefined,
      params.errorTitle,
    );
    return true;
  }

  permissions.handlePermissionDenied(
    failure.canAskAgain,
    params.blockedMessage,
    () => params.onObjectiveDenied(params.blockedTitle, params.blockedObjectiveMessage),
  );
  return true;
}
