import { useCallback, useEffect, useRef } from 'react';
import { BleManager, Device as BleDevice } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import type { BluetoothScanPayload } from '../api/contracts';
import { postBluetoothScans } from '../api/intelligence';
import {
  enqueueBluetoothOutbox,
  enqueueBluetoothOutboxMany,
  flushBluetoothOutboxInBatches,
} from '../services/bluetoothOutbox';
import { t } from '../i18n';
import { toMacLikeAddress } from '../utils/missionUtils';
import {
  BLUETOOTH_SCAN_WINDOW_MS,
  MAX_BLUETOOTH_DEVICES_PER_SYNC,
} from '../constants';
import type { PermissionFlowResult } from './permission.types';
import type { BluetoothSyncResult } from './telemetry.types';
import { useOutboxDelivery } from './useOutboxDelivery';
import {
  deliverTelemetryBatch,
  deliveryFailedTelemetryResult,
  ensureTelemetryPermissionGranted,
} from './telemetryDelivery';
import { addBluetoothScanCount } from '../storage/localTelemetryMirror';

export function useBluetoothSync(agentId: string, syncToServer = true) {
  const bleManagerRef = useRef<BleManager | null>(null);
  const { flushSafely: flushOutboxSafely, enqueueManyAndFlushSafely } = useOutboxDelivery({
    enabled: syncToServer,
    enqueue: enqueueBluetoothOutbox,
    enqueueMany: enqueueBluetoothOutboxMany,
    flush: () => flushBluetoothOutboxInBatches(postBluetoothScans),
  });

  const requestBluetoothPermissions = useCallback(
    async (options: { requestPermission?: boolean } = {}): Promise<PermissionFlowResult> => {
      if (Platform.OS !== 'android') return 'granted';

      const shouldRequest = options.requestPermission !== false;
      try {
        const perms = PermissionsAndroid.PERMISSIONS as Record<string, string>;
        const scanPerm = perms.BLUETOOTH_SCAN ?? 'android.permission.BLUETOOTH_SCAN';
        const connectPerm = perms.BLUETOOTH_CONNECT ?? 'android.permission.BLUETOOTH_CONNECT';

        if (!shouldRequest) {
          const hasScan = await PermissionsAndroid.check(scanPerm as never);
          const hasConnect = await PermissionsAndroid.check(connectPerm as never);
          return hasScan && hasConnect ? 'granted' : 'denied';
        }

        const scanResult = await PermissionsAndroid.request(scanPerm as never, {
          title: t.mission.bluetoothPermissionTitle,
          message: t.mission.bluetoothPermissionMessage,
          buttonNeutral: t.mission.bluetoothAskLater,
          buttonNegative: t.mission.bluetoothCancel,
          buttonPositive: t.mission.bluetoothOk,
        });

        if (scanResult !== PermissionsAndroid.RESULTS.GRANTED) {
          return scanResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'blocked' : 'denied';
        }

        const connectResult = await PermissionsAndroid.request(connectPerm as never, {
          title: t.mission.bluetoothPermissionTitleConnect,
          message: t.mission.bluetoothPermissionMessageConnect,
          buttonPositive: t.mission.bluetoothOk,
        });

        if (connectResult === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
        return connectResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'blocked' : 'denied';
      } catch (_error: unknown) {
        return 'denied';
      }
    },
    [],
  );

  const getBleManager = useCallback((): BleManager => {
    if (!bleManagerRef.current) {
      bleManagerRef.current = new BleManager();
    }
    return bleManagerRef.current;
  }, []);

  const scanNearbyBluetoothDevices = useCallback(
    async (options: { skipPermissionCheck?: boolean } = {}): Promise<{
      scans: BluetoothScanPayload[];
      scanFailed: boolean;
    }> => {
      if (Platform.OS === 'web') {
        return { scans: [], scanFailed: false };
      }

      if (!options.skipPermissionCheck) {
        const permission = await requestBluetoothPermissions();
        if (permission !== 'granted') {
          return { scans: [], scanFailed: false };
        }
      }

      const manager = getBleManager();
      const discovered = new Map<string, BluetoothScanPayload>();
      let scanFailed = false;

      return new Promise((resolve) => {
        let settled = false;
        const finalize = (failed: boolean) => {
          if (settled) return;
          settled = true;
          manager.stopDeviceScan();
          resolve({
            scans: Array.from(discovered.values()).slice(0, MAX_BLUETOOTH_DEVICES_PER_SYNC),
            scanFailed: failed,
          });
        };

        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        try {
          manager.startDeviceScan(null, { allowDuplicates: false }, (error, device: BleDevice | null) => {
            if (error) {
              scanFailed = true;
              return;
            }
            if (!device?.id || settled) return;
            const macAddress = /([0-9A-F]{2}:){5}[0-9A-F]{2}/i.test(device.id)
              ? device.id.toUpperCase()
              : toMacLikeAddress(device.id);
            if (discovered.has(macAddress)) return;
            discovered.set(macAddress, {
              agent_id: agentId,
              mac_address: macAddress,
              device_name: device.name ?? device.localName ?? 'unknown_device',
              rssi: typeof device.rssi === 'number' ? device.rssi : undefined,
            });
          });
          timeoutId = setTimeout(() => {
            finalize(scanFailed);
          }, BLUETOOTH_SCAN_WINDOW_MS);
        } catch (_error: unknown) {
          if (timeoutId) clearTimeout(timeoutId);
          finalize(true);
        }
      });
    },
    [agentId, getBleManager, requestBluetoothPermissions],
  );

  const syncBluetoothSnapshot = useCallback(
    async (options: { requestPermission?: boolean } = {}): Promise<BluetoothSyncResult> => {
      try {
        if (Platform.OS === 'web') {
          return deliverTelemetryBatch({
            payloads: [],
            syncToServer,
            enqueueManyAndFlushSafely,
            flushOutboxSafely,
          });
        }

        const permission: PermissionFlowResult = await requestBluetoothPermissions({
          requestPermission: options.requestPermission,
        });
        const permissionResult = ensureTelemetryPermissionGranted(permission);
        if (permissionResult) {
          return permissionResult;
        }

        const result = await scanNearbyBluetoothDevices({ skipPermissionCheck: true });
        const scans: BluetoothScanPayload[] = result.scans;
        if ((result.scanFailed && scans.length === 0) || scans.length === 0) {
          return deliverTelemetryBatch({
            payloads: [],
            syncToServer,
            enqueueManyAndFlushSafely,
            flushOutboxSafely,
          });
        }

        return deliverTelemetryBatch({
          payloads: scans,
          syncToServer,
          enqueueManyAndFlushSafely,
          flushOutboxSafely,
          onAcceptedLocally: async (payloads) => {
            await addBluetoothScanCount(agentId, payloads.length);
          },
        });
      } catch (_error: unknown) {
        return deliveryFailedTelemetryResult();
      }
    },
    [
      enqueueManyAndFlushSafely,
      flushOutboxSafely,
      syncToServer,
      requestBluetoothPermissions,
      scanNearbyBluetoothDevices,
    ],
  );

  useEffect(() => {
    return () => {
      try {
        bleManagerRef.current?.destroy();
      } catch {
        /* native BLE teardown can throw if scan is mid-flight */
      }
      bleManagerRef.current = null;
    };
  }, []);

  const flushPendingBluetooth = useCallback(async (): Promise<void> => {
    await flushOutboxSafely();
  }, [flushOutboxSafely]);

  return {
    syncBluetoothSnapshot,
    flushPendingBluetooth,
  };
}
