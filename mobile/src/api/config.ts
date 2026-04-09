import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { API_DEV_DEFAULT_PORT } from '../constants';

function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '');
}

function devApiUrlFromHostField(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const host = trimmed.split(':')[0]?.trim();
  if (!host) return null;
  return `http://${host}:${API_DEV_DEFAULT_PORT}`;
}

function resolveExpoDevHostApiUrl(): string | null {
  const hostUriUrl = devApiUrlFromHostField(Constants.expoConfig?.hostUri);
  if (hostUriUrl) return hostUriUrl;

  const manifest2 = (
    Constants as unknown as {
      manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
    }
  ).manifest2;
  const m2Url = devApiUrlFromHostField(manifest2?.extra?.expoGo?.debuggerHost);
  if (m2Url) return m2Url;

  const classicManifest = (
    Constants as unknown as { manifest?: { debuggerHost?: string } | null }
  ).manifest;
  return devApiUrlFromHostField(classicManifest?.debuggerHost);
}

const getDefaultApiUrl = (): string => {
  const expoDevHost = resolveExpoDevHostApiUrl();
  if (expoDevHost) return expoDevHost;
  if (Platform.OS === 'android' && !Device.isDevice) {
    return `http://10.0.2.2:${API_DEV_DEFAULT_PORT}`;
  }
  return `http://localhost:${API_DEV_DEFAULT_PORT}`;
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
    let raw = stripTrailingSlashes(fromEnv || fromExtra || getDefaultApiUrl());

    if (Device.isDevice && Platform.OS !== 'web' && isLoopbackApiUrl(raw)) {
      const fallback = stripTrailingSlashes(getDefaultApiUrl());
      if (!isLoopbackApiUrl(fallback)) {
        raw = fallback;
      }
    }

    return raw;
  } catch {
    return stripTrailingSlashes(getDefaultApiUrl());
  }
}

export const API_BASE_URL = getApiBaseUrl();

export function resolveApiMediaUrl(uri: string | null | undefined): string | null {
  if (!uri || typeof uri !== 'string') return null;
  const trimmed = uri.trim();
  if (!trimmed) return null;
  if (/^(file:|content:)/.test(trimmed)) return trimmed;
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  const base = stripTrailingSlashes(API_BASE_URL);
  return trimmed.startsWith('/') ? `${base}${trimmed}` : `${base}/${trimmed}`;
}
