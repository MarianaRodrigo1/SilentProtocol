import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BluetoothScanPayload } from '../api/contracts';
import { defineOutboxQueue } from './persistentOutbox';

const BLUETOOTH_OUTBOX_KEY = 'silent_protocol_bluetooth_outbox_v1';
const MAX_BLUETOOTH_OUTBOX_ITEMS = 600;
type OutboxBluetoothPayload = BluetoothScanPayload;

function isSameBluetoothScan(a: OutboxBluetoothPayload, b: OutboxBluetoothPayload): boolean {
  return (
    a.agent_id === b.agent_id &&
    (a.location_id ?? null) === (b.location_id ?? null) &&
    a.mac_address === b.mac_address &&
    (a.device_name ?? null) === (b.device_name ?? null) &&
    (a.rssi ?? null) === (b.rssi ?? null)
  );
}

const outbox = defineOutboxQueue<OutboxBluetoothPayload>({
  storageKey: BLUETOOTH_OUTBOX_KEY,
  maxItems: MAX_BLUETOOTH_OUTBOX_ITEMS,
  isSame: isSameBluetoothScan,
});

export async function enqueueBluetoothOutbox(payload: OutboxBluetoothPayload): Promise<boolean> {
  return outbox.enqueue(payload);
}

export async function enqueueBluetoothOutboxMany(payloads: OutboxBluetoothPayload[]): Promise<void> {
  await outbox.enqueueMany(payloads);
}

export async function flushBluetoothOutboxInBatches(
  sender: (payload: OutboxBluetoothPayload[]) => Promise<void>,
  batchSize = 25,
): Promise<void> {
  await outbox.flushInBatches(sender, batchSize);
}

export async function clearBluetoothOutboxStorage(): Promise<void> {
  await AsyncStorage.removeItem(BLUETOOTH_OUTBOX_KEY);
}
