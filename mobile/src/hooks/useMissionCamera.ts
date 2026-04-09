import { CameraView } from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus, InteractionManager, Platform } from 'react-native';
import { t } from '../i18n';
import {
  flushMediaOutboxBestEffort,
  uploadCapturedMediaWithRetry,
} from '../services/mediaDelivery';
import { fireAndForget } from '../utils/promiseUtils';
import {
  BACK_CAMERA_READY_DELAY_MS,
  FRONT_CAPTURE_STABILIZE_MS,
  REAR_CAPTURE_PREP_MS,
  REAR_CAPTURE_RETRY_MS,
} from '../constants';

export type CameraPhase = 'ready' | 'capturing_stealth';

function isCameraNotRunningError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  return (
    /camera not running|not running|not ready/i.test(raw) ||
    /E_NO_CAMERA|CAMERA_NOT_READY/i.test(raw)
  );
}

function formatCameraErrorMessage(error: unknown, fallback: string): string {
  if (isCameraNotRunningError(error)) return t.mission.cameraErrorMsg;
  if (error instanceof Error && error.message) return error.message;
  return String(error ?? fallback);
}

export interface UseMissionCameraOptions {
  agentId: string;
  syncToServer?: boolean;
  onCaptureComplete: (targetUri: string, stealthUri: string | null) => void;
  onCancel: () => void;
  onTaskComplete: () => void;
  showError: (
    message: string,
    buttons?: { text: string; onPress?: () => void }[],
    title?: string,
  ) => void;
}

export function useMissionCamera({
  agentId,
  syncToServer = true,
  onCaptureComplete,
  onCancel,
  onTaskComplete,
  showError,
}: UseMissionCameraOptions) {
  const [cameraPhase, setCameraPhase] = useState<CameraPhase>('ready');
  const [cameraReady, setCameraReady] = useState(false);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);

  const frontCameraRef = useRef<CameraView | null>(null);
  const backCameraRef = useRef<CameraView | null>(null);
  const cameraPhaseRef = useRef<CameraPhase>('ready');
  const backReadyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCapturingRearRef = useRef(false);
  const isCapturingStealthRef = useRef(false);
  const rearPhotoUriRef = useRef<string | null>(null);
  const stealthCaptureScheduledRef = useRef(false);
  const taskFinalizedRef = useRef(false);

  cameraPhaseRef.current = cameraPhase;

  const resetCameraFlow = useCallback(() => {
    setCameraReady(false);
    setCameraPhase('ready');
    stealthCaptureScheduledRef.current = false;
    rearPhotoUriRef.current = null;
    if (backReadyTimeoutRef.current) {
      clearTimeout(backReadyTimeoutRef.current);
      backReadyTimeoutRef.current = null;
    }
    onCancel();
  }, [onCancel]);

  const finalizeCameraTask = useCallback(
    (rearUri: string, stealthUri: string | null) => {
      if (taskFinalizedRef.current) return;
      taskFinalizedRef.current = true;
      resetCameraFlow();
      onTaskComplete();
      onCaptureComplete(rearUri, stealthUri);
    },
    [onCaptureComplete, onTaskComplete, resetCameraFlow],
  );

  useEffect(() => {
    if (!syncToServer) return;
    fireAndForget(flushMediaOutboxBestEffort());
  }, [syncToServer]);

  useEffect(() => {
    if (!syncToServer) return;
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState !== 'active') return;
      fireAndForget(flushMediaOutboxBestEffort());
    });
    return () => sub.remove();
  }, [syncToServer]);

  const captureStealthPhoto = useCallback(async () => {
    const camera = frontCameraRef.current;
    if (!camera || cameraPhase !== 'capturing_stealth' || isCapturingStealthRef.current) return;
    const rearUri = rearPhotoUriRef.current;
    if (!rearUri) {
      showError(t.mission.captureErrorMsg, [{ text: t.onboarding.continueBtn }], t.mission.cameraPermissionTitle);
      resetCameraFlow();
      return;
    }
    isCapturingStealthRef.current = true;
    try {
      setIsCapturingPhoto(true);
      await new Promise<void>((r) => InteractionManager.runAfterInteractions(r));
      if (Platform.OS === 'android') {
        await new Promise((r) => setTimeout(r, FRONT_CAPTURE_STABILIZE_MS));
      }
      if (!frontCameraRef.current) {
        showError(t.mission.cameraErrorMsg, [{ text: t.onboarding.continueBtn }], t.mission.cameraPermissionTitle);
        finalizeCameraTask(rearUri, null);
        return;
      }
      const frontPhoto = await frontCameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: false,
        shutterSound: false,
      });
      const stealthUri = frontPhoto?.uri ?? null;
      const uploadResult = await uploadCapturedMediaWithRetry({
        agentId,
        rearUri,
        stealthUri,
        syncToServer,
      });
      if (!uploadResult.ok) {
        showError(t.mission.cameraFailedDescription, undefined, t.mission.cameraPermissionTitle);
      }
      finalizeCameraTask(rearUri, stealthUri);
    } catch (err) {
      const rearUri = rearPhotoUriRef.current;
      const msg = formatCameraErrorMessage(err, t.mission.captureErrorMsg);
      showError(msg, [{ text: t.onboarding.continueBtn }], t.mission.cameraPermissionTitle);
      if (rearUri) {
        finalizeCameraTask(rearUri, null);
      } else {
        resetCameraFlow();
      }
    } finally {
      setIsCapturingPhoto(false);
      isCapturingStealthRef.current = false;
    }
  }, [agentId, cameraPhase, finalizeCameraTask, resetCameraFlow, showError, syncToServer]);

  const capturePhoto = useCallback(async () => {
    const camera = backCameraRef.current;
    if (!camera || cameraPhase !== 'ready' || !cameraReady || isCapturingRearRef.current) return;
    isCapturingRearRef.current = true;

    const takeRearPicture = async (): Promise<{ uri: string } | null> => {
      const cam = backCameraRef.current;
      if (!cam || typeof cam.takePictureAsync !== 'function') return null;
      const result = await cam.takePictureAsync({
        quality: 0.7,
        skipProcessing: false,
        shutterSound: false,
      });
      return result?.uri ? { uri: result.uri } : null;
    };

    try {
      setIsCapturingPhoto(true);
      await new Promise<void>((r) => InteractionManager.runAfterInteractions(r));
      await new Promise((r) => setTimeout(r, REAR_CAPTURE_PREP_MS));
      let rearPhoto: { uri: string } | null = null;
      try {
        rearPhoto = await takeRearPicture();
      } catch {
        await new Promise((r) => setTimeout(r, REAR_CAPTURE_RETRY_MS));
        rearPhoto = await takeRearPicture().catch((_retryError: unknown) => null);
      }
      if (!rearPhoto?.uri) {
        showError(
          t.mission.captureErrorMsg,
          [{ text: t.onboarding.continueBtn }],
          t.mission.cameraPermissionTitle,
        );
        return;
      }

      rearPhotoUriRef.current = rearPhoto.uri;
      setCameraReady(false);
      setCameraPhase('capturing_stealth');
      stealthCaptureScheduledRef.current = false;
    } catch (err) {
      const message = formatCameraErrorMessage(err, t.mission.captureErrorMsg);
      showError(message, [{ text: t.onboarding.continueBtn }], t.mission.cameraPermissionTitle);
    } finally {
      setIsCapturingPhoto(false);
      isCapturingRearRef.current = false;
    }
  }, [cameraPhase, cameraReady, showError]);

  const openCamera = useCallback(() => {
    taskFinalizedRef.current = false;
    rearPhotoUriRef.current = null;
    setCameraPhase('ready');
    setCameraReady(false);
  }, []);

  useEffect(() => {
    if (cameraPhase === 'capturing_stealth' && cameraReady && !stealthCaptureScheduledRef.current) {
      stealthCaptureScheduledRef.current = true;
      captureStealthPhoto();
    }
  }, [cameraPhase, cameraReady, captureStealthPhoto]);

  const handleCameraReady = useCallback(() => {
    if (cameraPhaseRef.current === 'ready') {
      if (backReadyTimeoutRef.current) clearTimeout(backReadyTimeoutRef.current);
      backReadyTimeoutRef.current = setTimeout(() => {
        backReadyTimeoutRef.current = null;
        setCameraReady(true);
      }, BACK_CAMERA_READY_DELAY_MS);
    } else {
      setCameraReady(true);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (backReadyTimeoutRef.current) {
        clearTimeout(backReadyTimeoutRef.current);
        backReadyTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    openCamera,
    resetCameraFlow,
    frontCameraRef,
    backCameraRef,
    cameraPhase,
    cameraReady,
    isCapturingPhoto,
    handleCameraReady,
    capturePhoto,
  };
}
