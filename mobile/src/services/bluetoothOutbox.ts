import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BluetoothScanPayload } from '../api';
import { AsyncStorageKeys, MAX_BLUETOOTH_OUTBOX_ITEMS } from '../constants';
import { defineOutboxQueue } from './persistentOutbox';

function isSameBluetoothScan(a: BluetoothScanPayload, b: BluetoothScanPayload): boolean {
  return (
    a.agent_id === b.agent_id &&
    a.mac_address === b.mac_address &&
    (a.device_name ?? null) === (b.device_name ?? null) &&
    (a.rssi ?? null) === (b.rssi ?? null)
  );
}

const outbox = defineOutboxQueue<BluetoothScanPayload>({
  storageKey: AsyncStorageKeys.bluetoothOutbox,
  maxItems: MAX_BLUETOOTH_OUTBOX_ITEMS,
  isSame: isSameBluetoothScan,
});

export async function enqueueBluetoothOutbox(payload: BluetoothScanPayload): Promise<boolean> {
  return outbox.enqueue(payload);
}

export async function enqueueBluetoothOutboxMany(payloads: BluetoothScanPayload[]): Promise<void> {
  await outbox.enqueueMany(payloads);
}

export async function flushBluetoothOutboxInBatches(
  sender: (payload: BluetoothScanPayload[]) => Promise<unknown>,
  batchSize = 25,
): Promise<void> {
  await outbox.flushInBatches(sender, batchSize);
}

export async function clearBluetoothOutboxStorage(): Promise<void> {
  await AsyncStorage.removeItem(AsyncStorageKeys.bluetoothOutbox);
}
