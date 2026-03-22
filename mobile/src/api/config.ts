import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const API_DEFAULT_PORT = 3000;

function resolveExpoDevHostApiUrl(): string | null {
  const fromHostUri = Constants.expoConfig?.hostUri?.trim();
  if (fromHostUri) {
    const host = fromHostUri.split(':')[0]?.trim();
    if (host) return `http://${host}:${API_DEFAULT_PORT}`;
  }

  const manifest2 = (
    Constants as unknown as {
      manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
    }
  ).manifest2;
  const debuggerHost = manifest2?.extra?.expoGo?.debuggerHost?.trim();
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0]?.trim();
    if (host) return `http://${host}:${API_DEFAULT_PORT}`;
  }

  const classicManifest = (
    Constants as unknown as { manifest?: { debuggerHost?: string } | null }
  ).manifest;
  const classicHost = classicManifest?.debuggerHost?.trim();
  if (classicHost) {
    const host = classicHost.split(':')[0]?.trim();
    if (host) return `http://${host}:${API_DEFAULT_PORT}`;
  }

  return null;
}

const getDefaultApiUrl = (): string => {
  const expoDevHost = resolveExpoDevHostApiUrl();
  if (expoDevHost) return expoDevHost;
  if (Platform.OS === 'android') {
    if (!Device.isDevice) {
      return `http://10.0.2.2:${API_DEFAULT_PORT}`;
    }
  }
  return `http://localhost:${API_DEFAULT_PORT}`;
};

function isLoopbackApiUrl(url: string): boolean {
  try {
    const normalized = /^[a-z]+:\/\//i.test(url) ? url : `http://${url}`;
    const { hostname } = new URL(normalized);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
  } catch {
    return /localhost|127\.0\.0\.1/i.test(url);
  }
}

function getApiBaseUrl(): string {
  try {
    const fromEnv =
      typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_API_URL?.trim() : undefined;
    const fromExtra = Constants.expoConfig?.extra?.apiUrl?.trim();
    let raw = (fromEnv || fromExtra || getDefaultApiUrl()).replace(/\/+$/, '');

    if (Device.isDevice && Platform.OS !== 'web' && isLoopbackApiUrl(raw)) {
      const fallback = getDefaultApiUrl().replace(/\/+$/, '');
      if (!isLoopbackApiUrl(fallback)) {
        raw = fallback;
      }
    }

    return raw;
  } catch (_error: unknown) {
    return getDefaultApiUrl().replace(/\/+$/, '');
  }
}

export const API_BASE_URL = getApiBaseUrl();
