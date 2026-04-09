import * as Location from 'expo-location';
import { Platform } from 'react-native';
import {
  GPS_GET_CURRENT_TIMEOUT_MS,
  GPS_LAST_KNOWN_FALLBACK_MAX_AGE_MS,
  GPS_LAST_KNOWN_LOOSE_MAX_AGE_MS,
  GPS_LAST_KNOWN_LOOSE_REQUIRED_ACCURACY_M,
  GPS_LAST_KNOWN_RECENT_MAX_AGE_MS,
  GPS_WEB_GEOLOCATION_MAXIMUM_AGE_MS,
  GPS_WEB_GEOLOCATION_TIMEOUT_MS,
} from '../constants';

export interface TrackedPosition {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp: number;
}

function toTrackedPosition(coords: Location.LocationObject): TrackedPosition {
  return {
    latitude: coords.coords.latitude,
    longitude: coords.coords.longitude,
    accuracy: coords.coords.accuracy ?? undefined,
    timestamp: coords.timestamp ?? Date.now(),
  };
}

function withTimeout(promise: Promise<Location.LocationObject>, timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('timeout')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

function waitForFirstWatchFix(
  timeoutMs: number,
  options: Location.LocationOptions,
): Promise<Location.LocationObject | null> {
  return new Promise((resolve) => {
    let settled = false;
    let subscription: Awaited<ReturnType<typeof Location.watchPositionAsync>> | null = null;

    const finish = (loc: Location.LocationObject | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        subscription?.remove();
      } catch {
        /* noop */
      }
      resolve(loc);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    void (async () => {
      try {
        subscription = await Location.watchPositionAsync(
          options,
          (location) => {
            if (location?.coords) finish(location);
          },
          () => finish(null),
        );
        if (settled) {
          try {
            subscription.remove();
          } catch {
            /* noop */
          }
        }
      } catch {
        finish(null);
      }
    })();
  });
}

export async function captureCurrentTrackedPosition(): Promise<TrackedPosition | null> {
  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? undefined,
            timestamp: pos.timestamp ?? Date.now(),
          }),
        () => resolve(null),
        {
          enableHighAccuracy: true,
          timeout: GPS_WEB_GEOLOCATION_TIMEOUT_MS,
          maximumAge: GPS_WEB_GEOLOCATION_MAXIMUM_AGE_MS,
        },
      );
    });
  }

  try {
    const fg = await Location.getForegroundPermissionsAsync();
    if (fg.status !== 'granted') return null;

    const servicesOn = await Location.hasServicesEnabledAsync().catch(() => true);
    if (!servicesOn) return null;

    const androidOpts = Platform.OS === 'android' ? { mayShowUserSettingsDialog: true as const } : {};

    const lastKnownRecent = await Location.getLastKnownPositionAsync({
      maxAge: GPS_LAST_KNOWN_RECENT_MAX_AGE_MS,
    }).catch(() => null);
    if (lastKnownRecent?.coords) {
      return toTrackedPosition(lastKnownRecent);
    }

    const attempts: (() => Promise<Location.LocationObject>)[] = [
      () =>
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
          ...androidOpts,
        }),
      () =>
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          ...androidOpts,
        }),
      () =>
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Lowest,
          ...androidOpts,
        }),
    ];

    let coords: Location.LocationObject | null = null;
    for (const getPos of attempts) {
      try {
        coords = await withTimeout(getPos(), GPS_GET_CURRENT_TIMEOUT_MS);
        if (coords?.coords) break;
      } catch {
        coords = null;
      }
    }

    if (!coords?.coords) {
      coords = await waitForFirstWatchFix(40_000, {
        accuracy: Location.Accuracy.Lowest,
        timeInterval: 1000,
        distanceInterval: 1,
        ...androidOpts,
      });
    }

    if (!coords?.coords) {
      const last = await Location.getLastKnownPositionAsync({
        maxAge: GPS_LAST_KNOWN_FALLBACK_MAX_AGE_MS,
      }).catch(() => null);
      if (last?.coords) coords = last;
    }

    if (!coords?.coords) {
      const lastLoose = await Location.getLastKnownPositionAsync({
        maxAge: GPS_LAST_KNOWN_LOOSE_MAX_AGE_MS,
        requiredAccuracy: GPS_LAST_KNOWN_LOOSE_REQUIRED_ACCURACY_M,
      }).catch(() => null);
      if (lastLoose?.coords) coords = lastLoose;
    }

    if (!coords?.coords) return null;
    return toTrackedPosition(coords);
  } catch {
    return null;
  }
}
