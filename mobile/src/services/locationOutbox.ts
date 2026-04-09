import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PostLocationPayload } from '../api';
import { AsyncStorageKeys, LOCATION_OUTBOX_FLUSH_BATCH_SIZE, MAX_LOCATION_OUTBOX_ITEMS } from '../constants';
import { areRedundantLocationOutboxEntries } from '../utils/locationDedupe';
import { defineOutboxQueue } from './persistentOutbox';

const outbox = defineOutboxQueue<PostLocationPayload>({
  storageKey: AsyncStorageKeys.locationOutbox,
  maxItems: MAX_LOCATION_OUTBOX_ITEMS,
  isSame: areRedundantLocationOutboxEntries,
});

export async function enqueueLocationOutbox(payload: PostLocationPayload): Promise<boolean> {
  return outbox.enqueue(payload);
}

export async function enqueueLocationOutboxMany(payloads: PostLocationPayload[]): Promise<void> {
  await outbox.enqueueMany(payloads);
}

export async function flushLocationOutboxInBatches(
  sender: (payload: PostLocationPayload[]) => Promise<unknown>,
  batchSize = LOCATION_OUTBOX_FLUSH_BATCH_SIZE,
): Promise<void> {
  await outbox.flushInBatches(sender, batchSize);
}

export async function clearLocationOutboxStorage(): Promise<void> {
  await AsyncStorage.removeItem(AsyncStorageKeys.locationOutbox);
}
