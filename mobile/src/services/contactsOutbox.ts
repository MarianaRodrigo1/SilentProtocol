import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ContactLeakPayload } from '../api';
import { AsyncStorageKeys, MAX_CONTACTS_OUTBOX_ITEMS, TELEMETRY_OUTBOX_FLUSH_CHUNK_SIZE } from '../constants';
import { defineOutboxQueue } from './persistentOutbox';

function isSameContactLeak(a: ContactLeakPayload, b: ContactLeakPayload): boolean {
  return (
    a.agent_id === b.agent_id &&
    a.contact_hash === b.contact_hash &&
    a.leak_source === b.leak_source &&
    (a.risk_level ?? 'medium') === (b.risk_level ?? 'medium')
  );
}

const outbox = defineOutboxQueue<ContactLeakPayload>({
  storageKey: AsyncStorageKeys.contactsOutbox,
  maxItems: MAX_CONTACTS_OUTBOX_ITEMS,
  isSame: isSameContactLeak,
});

export async function enqueueContactsOutbox(payload: ContactLeakPayload): Promise<boolean> {
  return outbox.enqueue(payload);
}

export async function enqueueContactsOutboxMany(payloads: ContactLeakPayload[]): Promise<void> {
  await outbox.enqueueMany(payloads);
}

export async function flushContactsOutboxInBatches(
  sender: (payload: ContactLeakPayload[]) => Promise<unknown>,
  batchSize = TELEMETRY_OUTBOX_FLUSH_CHUNK_SIZE,
): Promise<void> {
  await outbox.flushInBatches(sender, batchSize);
}

export async function clearContactsOutboxStorage(): Promise<void> {
  await AsyncStorage.removeItem(AsyncStorageKeys.contactsOutbox);
}
