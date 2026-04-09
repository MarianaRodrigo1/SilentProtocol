import { CameraView } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CRTScanlines, GlitchText } from './crt';
import { t } from '../i18n';
import { useMissionCamera } from '../hooks/useMissionCamera';
import styles from '../styles/mission';
import { spacing } from '../styles/theme';

export interface MissionCameraViewProps {
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

function CameraCancelButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      style={styles.cameraButtonCancel}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t.mission.cameraCancel}
    >
      <Text style={styles.cameraButtonText}>{t.mission.cameraCancel}</Text>
    </Pressable>
  );
}

export function MissionCameraView({
  agentId,
  syncToServer = true,
  onCaptureComplete,
  onCancel,
  onTaskComplete,
  showError,
}: MissionCameraViewProps) {
  const insets = useSafeAreaInsets();
  const edgePad = insets.top + spacing.xl;
  const edgePadBottom = insets.bottom + spacing.xl;
  const camera = useMissionCamera({
    agentId,
    syncToServer,
    onCaptureComplete,
    onCancel,
    onTaskComplete,
    showError,
  });

  useEffect(() => {
    camera.openCamera?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `openCamera` is stable; whole `camera` object is not
  }, [camera.openCamera]);

  const isStealthPhase = camera.cameraPhase === 'capturing_stealth';
  const hideCameraPreview =
    isStealthPhase || (camera.cameraPhase === 'ready' && !camera.cameraReady);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <CRTScanlines />
      <View style={[StyleSheet.absoluteFill, { zIndex: 0 }]} pointerEvents="box-none">
        {isStealthPhase ? (
          <CameraView
            ref={camera.frontCameraRef}
            facing="front"
            style={[StyleSheet.absoluteFill, { opacity: 0 }]}
            onCameraReady={camera.handleCameraReady}
          />
        ) : (
          <CameraView
            ref={camera.backCameraRef}
            facing="back"
            style={[StyleSheet.absoluteFill, !camera.cameraReady && { opacity: 0 }]}
            onCameraReady={camera.handleCameraReady}
          />
        )}
      </View>
      {hideCameraPreview ? (
        <View
          style={[
            styles.cameraModalLayer,
            styles.cameraCalibratingScrim,
            {
              paddingTop: edgePad,
              paddingBottom: edgePadBottom,
              justifyContent: isStealthPhase ? 'center' : 'space-between',
              zIndex: 10,
            },
          ]}
          pointerEvents="box-none"
        >
          <GlitchText style={styles.cameraTitle} glitchIntensity="low">
            {isStealthPhase ? t.mission.processing : t.mission.cameraCalibratingTitle}
          </GlitchText>
          {!isStealthPhase && (
            <View style={styles.cameraButtons} pointerEvents="box-none">
              <CameraCancelButton onPress={camera.resetCameraFlow} />
            </View>
          )}
        </View>
      ) : null}
      {!isStealthPhase && camera.cameraReady ? (
        <View
          style={[
            styles.cameraOverlay,
            styles.cameraModalLayer,
            {
              backgroundColor: 'transparent',
              paddingTop: edgePad,
              paddingBottom: edgePadBottom,
              zIndex: 5,
            },
          ]}
          pointerEvents="box-none"
        >
          <GlitchText style={styles.cameraTitle} glitchIntensity="high">
            {t.mission.cameraColorCalibration}
          </GlitchText>
          <Text style={styles.cameraHint}>{t.mission.cameraBlueHint}</Text>
          <View style={styles.cameraButtons} pointerEvents="box-none">
            <CameraCancelButton onPress={camera.resetCameraFlow} />
            <Pressable
              style={[
                styles.cameraButtonCapture,
                (camera.isCapturingPhoto || !camera.cameraReady) && styles.cameraButtonDisabled,
              ]}
              onPress={camera.capturePhoto}
              disabled={camera.isCapturingPhoto || !camera.cameraReady}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={t.mission.cameraCapture}
            >
              <Text style={styles.cameraButtonText}>
                {!camera.cameraReady
                  ? t.mission.cameraReadying
                  : camera.isCapturingPhoto
                    ? t.mission.cameraCapturing
                    : t.mission.cameraCapture}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
