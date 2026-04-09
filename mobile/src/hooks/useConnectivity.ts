import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import { probeBackendReachable } from '../api';
import { CONNECTIVITY_BACKEND_PROBE_INTERVAL_MS, CONNECTIVITY_BACKEND_PROBE_TIMEOUT_MS } from '../constants';

function evaluateNetworkReachable(state: NetInfoState): boolean {
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

export function useConnectivity(enabled = true) {
  const [networkReachable, setNetworkReachable] = useState(true);
  const [backendReachable, setBackendReachable] = useState(true);
  const [probePending, setProbePending] = useState(enabled);
  const probeSequenceRef = useRef(0);

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const probeBackend = useCallback(async (): Promise<boolean> => {
    if (!enabledRef.current) return true;

    if (Platform.OS !== 'web') {
      let net: NetInfoState | null = null;
      try {
        net = await NetInfo.fetch();
      } catch {
        net = null;
      }
      if (net && !evaluateNetworkReachable(net)) return false;
    }

    return probeBackendReachable(CONNECTIVITY_BACKEND_PROBE_TIMEOUT_MS);
  }, []);

  const runProbeCycle = useCallback(async () => {
    if (!enabledRef.current) return;
    const sequence = ++probeSequenceRef.current;
    try {
      setProbePending(true);
      const ok = await probeBackend();
      if (sequence !== probeSequenceRef.current) return;
      setBackendReachable(ok);
    } catch {
      if (sequence !== probeSequenceRef.current) return;
      setBackendReachable(false);
    } finally {
      if (sequence !== probeSequenceRef.current) return;
      setProbePending(false);
    }
  }, [probeBackend]);

  useEffect(() => {
    if (!enabled) {
      probeSequenceRef.current += 1;
      setNetworkReachable(true);
      setBackendReachable(true);
      setProbePending(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const removeListenersRef = { current: undefined as (() => void) | undefined };

    const cleanup = () => {
      cancelled = true;
      removeListenersRef.current?.();
      removeListenersRef.current = undefined;
    };

    if (Platform.OS === 'web') {
      const syncFromNavigator = () => {
        if (cancelled) return;
        const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
        setNetworkReachable(online);
      };
      syncFromNavigator();
      if (typeof window !== 'undefined') {
        window.addEventListener('online', syncFromNavigator);
        window.addEventListener('offline', syncFromNavigator);
        removeListenersRef.current = () => {
          window.removeEventListener('online', syncFromNavigator);
          window.removeEventListener('offline', syncFromNavigator);
        };
      }
      return cleanup;
    }

    void (async () => {
      try {
        const s = await NetInfo.fetch();
        if (!cancelled) setNetworkReachable(evaluateNetworkReachable(s));
      } catch {
        if (!cancelled) setNetworkReachable(true);
      }

      try {
        const unsub = NetInfo.addEventListener((s) => {
          if (!cancelled) setNetworkReachable(evaluateNetworkReachable(s));
        });
        removeListenersRef.current = () => {
          try {
            unsub();
          } catch {
            /* ignore */
          }
        };
      } catch {
        /* NetInfo unavailable */
      }
    })();

    return cleanup;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (!networkReachable) {
      probeSequenceRef.current += 1;
      setBackendReachable(false);
      setProbePending(false);
      return;
    }
    void runProbeCycle();
  }, [enabled, networkReachable, runProbeCycle]);

  useEffect(() => {
    if (!enabled) return;
    const onAppState = (s: AppStateStatus) => {
      if (s === 'active') void runProbeCycle();
    };
    const sub = AppState.addEventListener('change', onAppState);
    const id = setInterval(() => void runProbeCycle(), CONNECTIVITY_BACKEND_PROBE_INTERVAL_MS);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, [enabled, runProbeCycle]);

  const linkQuality = useMemo(() => {
    if (!enabled) return 'ok' as const;
    if (!networkReachable) return 'no_network' as const;
    if (probePending) return 'checking' as const;
    if (!backendReachable) return 'no_backend' as const;
    return 'ok' as const;
  }, [backendReachable, enabled, networkReachable, probePending]);

  return {
    linkQuality,
  };
}
