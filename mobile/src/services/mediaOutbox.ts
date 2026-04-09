import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UploadMediaPayload } from '../api';
import { AsyncStorageKeys, MAX_MEDIA_OUTBOX_ITEMS } from '../constants';
import { defineOutboxQueue } from './persistentOutbox';

function isSameMedia(a: UploadMediaPayload, b: UploadMediaPayload): boolean {
  return a.agent_id === b.agent_id && a.media_type === b.media_type && a.uri === b.uri;
}

const outbox = defineOutboxQueue<UploadMediaPayload>({
  storageKey: AsyncStorageKeys.mediaOutbox,
  maxItems: MAX_MEDIA_OUTBOX_ITEMS,
  isSame: isSameMedia,
});

export async function enqueueMediaOutbox(payload: UploadMediaPayload): Promise<boolean> {
  return outbox.enqueue(payload);
}

export async function flushMediaOutbox(
  sender: (payload: UploadMediaPayload) => Promise<unknown>,
  shouldDiscard?: (error: unknown, payload: UploadMediaPayload) => boolean,
): Promise<void> {
  await outbox.flushOneByOne(sender, shouldDiscard);
}

export async function clearMediaOutboxStorage(): Promise<void> {
  await AsyncStorage.removeItem(AsyncStorageKeys.mediaOutbox);
}
