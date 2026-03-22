import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ContactLeakPayload } from '../api/contracts';
import { defineOutboxQueue } from './persistentOutbox';

const CONTACTS_OUTBOX_KEY = 'silent_protocol_contacts_outbox_v1';
const MAX_CONTACTS_OUTBOX_ITEMS = 600;
type OutboxContactPayload = ContactLeakPayload;

function isSameContactLeak(a: OutboxContactPayload, b: OutboxContactPayload): boolean {
  return (
    a.agent_id === b.agent_id &&
    (a.location_id ?? null) === (b.location_id ?? null) &&
    a.contact_hash === b.contact_hash &&
    a.leak_source === b.leak_source &&
    (a.risk_level ?? 'medium') === (b.risk_level ?? 'medium')
  );
}

const outbox = defineOutboxQueue<OutboxContactPayload>({
  storageKey: CONTACTS_OUTBOX_KEY,
  maxItems: MAX_CONTACTS_OUTBOX_ITEMS,
  isSame: isSameContactLeak,
});

export async function enqueueContactsOutbox(payload: OutboxContactPayload): Promise<boolean> {
  return outbox.enqueue(payload);
}

export async function enqueueContactsOutboxMany(payloads: OutboxContactPayload[]): Promise<void> {
  await outbox.enqueueMany(payloads);
}

export async function flushContactsOutboxInBatches(
  sender: (payload: OutboxContactPayload[]) => Promise<void>,
  batchSize = 25,
): Promise<void> {
  await outbox.flushInBatches(sender, batchSize);
}

export async function clearContactsOutboxStorage(): Promise<void> {
  await AsyncStorage.removeItem(CONTACTS_OUTBOX_KEY);
}
