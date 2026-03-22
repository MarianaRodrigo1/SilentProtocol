const path = require('path');

try {
  require('dotenv').config({ path: path.resolve(__dirname, '.env') });
} catch {}

const apiUrlFromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();

module.exports = {
  expo: {
    icon: './assets/logo.png',
    plugins: [
      [
        'expo-splash-screen',
        {
          backgroundColor: '#000000',
          image: './assets/logo.png',
        },
      ],
      [
        'expo-contacts',
        {
          contactsPermission:
            'Contacts access is required to map trusted mission contacts.',
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Location is used to keep mission tracking active while the app runs in the background.',
          locationWhenInUsePermission:
            'Location is used to calibrate mission route telemetry.',
          isIosBackgroundLocationEnabled: true,
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true,
        },
      ],
      './plugins/withGradleWarningMode.js',
      './plugins/withShortCmakePath.js',
    ],
    name: 'Silent Protocol',
    slug: 'silent-protocol',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    splash: {
      backgroundColor: '#000000',
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSCameraUsageDescription:
          'Camera access is required for visual mission confirmation.',
        NSLocationWhenInUseUsageDescription:
          'Location access is required for mission route tracking.',
        NSLocationAlwaysAndWhenInUseUsageDescription:
          'Background location access is required for continuous mission tracking.',
        NSLocationAlwaysUsageDescription:
          'Background location access is required for mission tracking.',
        NSContactsUsageDescription:
          'Contacts access is required for trusted network mapping.',
        NSBluetoothAlwaysUsageDescription:
          'Bluetooth access is required for nearby signal reconnaissance.',
        UIBackgroundModes: ['location'],
      },
    },
    android: {
      usesCleartextTraffic: true,
      permissions: [
        'CAMERA',
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
        'FOREGROUND_SERVICE',
        'FOREGROUND_SERVICE_LOCATION',
        'BLUETOOTH_SCAN',
        'BLUETOOTH_CONNECT',
        'android.permission.READ_CONTACTS',
      ],
      package: 'com.marianarodrigo.silentprotocol',
    },
    web: {
      output: 'single',
    },
    extra: {
      ...(apiUrlFromEnv ? { apiUrl: apiUrlFromEnv.replace(/\/+$/, '') } : {}),
      eas: {
        projectId: '8aa6d94b-4d79-43eb-8879-021fbac192d0',
      },
    },
  },
};
