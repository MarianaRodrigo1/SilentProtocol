import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PostLocationPayload } from '../api/contracts';
import { areRedundantLocationOutboxEntries } from '../location/locationTelemetryDedupe';
import { LOCATION_OUTBOX_FLUSH_BATCH_SIZE } from '../location/locationTelemetryConfig';
import { defineOutboxQueue } from './persistentOutbox';

const LOCATION_OUTBOX_KEY = 'silent_protocol_location_outbox_v1';
const MAX_OUTBOX_ITEMS = 200;
type OutboxLocationPayload = PostLocationPayload;

const outbox = defineOutboxQueue<OutboxLocationPayload>({
  storageKey: LOCATION_OUTBOX_KEY,
  maxItems: MAX_OUTBOX_ITEMS,
  isSame: areRedundantLocationOutboxEntries,
});

export async function enqueueLocationOutbox(payload: OutboxLocationPayload): Promise<boolean> {
  return outbox.enqueue(payload);
}

export async function enqueueLocationOutboxMany(payloads: OutboxLocationPayload[]): Promise<void> {
  await outbox.enqueueMany(payloads);
}

export async function flushLocationOutboxInBatches(
  sender: (payload: OutboxLocationPayload[]) => Promise<void>,
  batchSize = LOCATION_OUTBOX_FLUSH_BATCH_SIZE,
): Promise<void> {
  await outbox.flushInBatches(sender, batchSize);
}

export async function clearLocationOutboxStorage(): Promise<void> {
  await AsyncStorage.removeItem(LOCATION_OUTBOX_KEY);
}
