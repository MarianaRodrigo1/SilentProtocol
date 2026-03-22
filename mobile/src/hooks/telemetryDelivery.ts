import type { FlushOutcome } from './useOutboxDelivery';
import type { TelemetryDeliveryState, TelemetrySyncResult } from './telemetry.types';
import type { PermissionFlowResult } from './permission.types';
import { errResult, okResult } from '../types/result';

function resolveTelemetryDelivery(
  outcome: FlushOutcome,
): TelemetryDeliveryState {
  if (outcome === 'flushed' || outcome === 'disabled') return 'uploaded_now';
  if (outcome === 'failed_retryable' || outcome === 'in_flight') return 'queued_for_retry';
  if (outcome === 'failed') return 'failed';
  return 'failed';
}

function toTelemetrySyncResult(
  outcome: FlushOutcome,
): TelemetrySyncResult {
  const delivery = resolveTelemetryDelivery(outcome);
  if (delivery === 'failed') {
    return deliveryFailedTelemetryResult();
  }
  return okResult({ delivery });
}

function permissionDeniedTelemetryResult(permission: PermissionFlowResult): TelemetrySyncResult {
  return errResult({
    reason: 'permission_denied' as const,
    permission,
  });
}

export function ensureTelemetryPermissionGranted(
  permission: PermissionFlowResult,
): TelemetrySyncResult | null {
  if (permission === 'granted') return null;
  return permissionDeniedTelemetryResult(permission);
}

export function deliveryFailedTelemetryResult(): TelemetrySyncResult {
  return errResult({
    reason: 'delivery_failed' as const,
    permission: 'granted' as const,
  });
}

function nonBlockingTelemetrySuccess(flushOutboxSafely: () => Promise<FlushOutcome>): TelemetrySyncResult {
  void flushOutboxSafely();
  return okResult({ delivery: 'uploaded_now' as const });
}

export async function flushTelemetryOutboxToSyncResult(
  flushOutboxSafely: () => Promise<FlushOutcome>,
): Promise<TelemetrySyncResult> {
  const outcome = await flushOutboxSafely();
  return toTelemetrySyncResult(outcome);
}

interface DeliverTelemetryBatchOptions<TPayload> {
  payloads: TPayload[];
  syncToServer: boolean;
  enqueueManyAndFlushSafely: (payloads: TPayload[]) => Promise<FlushOutcome>;
  flushOutboxSafely: () => Promise<FlushOutcome>;
  onAcceptedLocally?: (payloads: TPayload[]) => void | Promise<void>;
}

export async function deliverTelemetryBatch<TPayload>({
  payloads,
  syncToServer,
  enqueueManyAndFlushSafely,
  flushOutboxSafely,
  onAcceptedLocally,
}: DeliverTelemetryBatchOptions<TPayload>): Promise<TelemetrySyncResult> {
  if (payloads.length === 0) {
    return nonBlockingTelemetrySuccess(flushOutboxSafely);
  }

  if (onAcceptedLocally) {
    await onAcceptedLocally(payloads);
  }

  if (!syncToServer) {
    return okResult({ delivery: 'uploaded_now' as const });
  }

  const outcome = await enqueueManyAndFlushSafely(payloads);
  return toTelemetrySyncResult(outcome);
}
