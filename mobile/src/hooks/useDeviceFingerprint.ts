import * as Battery from 'expo-battery';
import * as Device from 'expo-device';
import { useEffect, useState } from 'react';

export interface DeviceFingerprint {
  model: string;
  battery: string;
  manufacturer: string;
}

export function useDeviceFingerprint(): DeviceFingerprint {
  const [fingerprint, setFingerprint] = useState<DeviceFingerprint>({
    model: 'UNKNOWN',
    battery: '--%',
    manufacturer: 'N/A',
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const model = Device.modelName ?? Device.deviceName ?? 'UNKNOWN';
        const manufacturer = Device.manufacturer ?? 'N/A';
        let batteryStr = '--%';

        try {
          const level = await Battery.getBatteryLevelAsync();
          if (level !== null && level >= 0) batteryStr = `${Math.round(level * 100)}%`;
        } catch (_batteryError: unknown) {}

        if (mounted) {
          setFingerprint({ model: model || 'UNKNOWN', battery: batteryStr, manufacturer: manufacturer || 'N/A' });
        }
      } catch (_error: unknown) {
        if (mounted) setFingerprint({ model: 'UNKNOWN', battery: '--%', manufacturer: 'N/A' });
      }
    };

    void load();
    return () => { mounted = false; };
  }, []);

  return fingerprint;
}
