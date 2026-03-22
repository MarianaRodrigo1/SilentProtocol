import { useCallback, useEffect, useRef } from 'react';

/** Clears timers on unmount only; avoid calling `clearAllMissionTimers` during normal render (breaks decrypt window). */
export function useMissionTimers() {
  const decryptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const missionCompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDecryptTimer = useCallback(() => {
    if (decryptTimerRef.current) {
      clearTimeout(decryptTimerRef.current);
      decryptTimerRef.current = null;
    }
  }, []);

  const clearMissionCompleteTimer = useCallback(() => {
    if (missionCompleteTimerRef.current) {
      clearTimeout(missionCompleteTimerRef.current);
      missionCompleteTimerRef.current = null;
    }
  }, []);

  const scheduleDecryptWindow = useCallback(
    (durationMs: number, onStart: () => void, onEnd: () => void) => {
      clearDecryptTimer();
      onStart();
      decryptTimerRef.current = setTimeout(() => {
        onEnd();
        decryptTimerRef.current = null;
      }, durationMs);
    },
    [clearDecryptTimer],
  );

  const scheduleMissionComplete = useCallback(
    (delayMs: number, callback: () => void) => {
      clearMissionCompleteTimer();
      missionCompleteTimerRef.current = setTimeout(() => {
        callback();
        missionCompleteTimerRef.current = null;
      }, delayMs);
    },
    [clearMissionCompleteTimer],
  );

  const clearAllMissionTimers = useCallback(() => {
    clearDecryptTimer();
    clearMissionCompleteTimer();
  }, [clearDecryptTimer, clearMissionCompleteTimer]);

  useEffect(() => {
    return () => {
      clearAllMissionTimers();
    };
  }, [clearAllMissionTimers]);

  return {
    clearAllMissionTimers,
    scheduleDecryptWindow,
    scheduleMissionComplete,
  };
}
