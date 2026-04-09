import { type UploadMediaPayload, uploadMedia } from '../api';
import { enqueueMediaOutbox, flushMediaOutbox } from './mediaOutbox';
import { errResult, okResult, type Result } from '../types/result';
import { runBestEffort } from '../utils/promiseUtils';

export type MediaDeliveryState = 'uploaded_now' | 'queued_for_retry' | 'offline_mode';

export type MediaUploadResult = Result<
  { delivery: MediaDeliveryState },
  { reason: 'permanent_upload_error' }
>;

export function isPermanentMediaUploadError(error: unknown): boolean {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  return /Could not read media before upload|ENOENT|no such file/i.test(raw);
}

export async function flushMediaOutboxBestEffort(): Promise<void> {
  await runBestEffort(() => flushMediaOutbox(uploadMedia, isPermanentMediaUploadError));
}

export async function uploadCapturedMediaWithRetry(params: {
  agentId: string;
  rearUri: string;
  stealthUri: string | null;
  syncToServer: boolean;
}): Promise<MediaUploadResult> {
  const { agentId, rearUri, stealthUri, syncToServer } = params;
  if (!syncToServer) return okResult({ delivery: 'offline_mode' as const });

  let hasQueuedForRetry = false;
  let hasPermanentFailure = false;
  let hasTransientFailure = false;

  const tryUploadWithOutbox = async (
    payload: UploadMediaPayload,
  ): Promise<'uploaded_now' | 'queued_for_retry' | 'permanent_failure'> => {
    try {
      await uploadMedia(payload);
      return 'uploaded_now';
    } catch (error) {
      const permanent = isPermanentMediaUploadError(error);
      if (permanent) {
        hasPermanentFailure = true;
        return 'permanent_failure';
      }
      hasTransientFailure = true;
      await enqueueMediaOutbox(payload);
      hasQueuedForRetry = true;
      return 'queued_for_retry';
    }
  };

  await flushMediaOutboxBestEffort();
  await tryUploadWithOutbox({ agent_id: agentId, media_type: 'TARGET', uri: rearUri });
  if (stealthUri) {
    await tryUploadWithOutbox({ agent_id: agentId, media_type: 'STEALTH', uri: stealthUri });
  }

  if (hasQueuedForRetry) {
    await flushMediaOutboxBestEffort();
  }

  if (hasPermanentFailure) {
    return errResult({ reason: 'permanent_upload_error' as const });
  }
  if (hasTransientFailure) {
    return okResult({ delivery: 'queued_for_retry' as const });
  }
  return okResult({ delivery: 'uploaded_now' as const });
}
