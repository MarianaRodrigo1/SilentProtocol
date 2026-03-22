import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UploadMediaPayload } from '../api/contracts';
import { defineOutboxQueue } from './persistentOutbox';

const MEDIA_OUTBOX_KEY = 'silent_protocol_media_outbox_v1';
const MAX_MEDIA_OUTBOX_ITEMS = 100;
export type OutboxMediaPayload = UploadMediaPayload;

function isSameMedia(a: OutboxMediaPayload, b: OutboxMediaPayload): boolean {
  return a.agent_id === b.agent_id && a.media_type === b.media_type && a.uri === b.uri;
}

const outbox = defineOutboxQueue<OutboxMediaPayload>({
  storageKey: MEDIA_OUTBOX_KEY,
  maxItems: MAX_MEDIA_OUTBOX_ITEMS,
  isSame: isSameMedia,
});

export async function enqueueMediaOutbox(payload: OutboxMediaPayload): Promise<boolean> {
  return outbox.enqueue(payload);
}

export async function flushMediaOutbox(
  sender: (payload: OutboxMediaPayload) => Promise<void>,
  shouldDiscard?: (error: unknown, payload: OutboxMediaPayload) => boolean,
): Promise<void> {
  await outbox.flushOneByOne(sender, shouldDiscard);
}

export async function clearMediaOutboxStorage(): Promise<void> {
  await AsyncStorage.removeItem(MEDIA_OUTBOX_KEY);
}
