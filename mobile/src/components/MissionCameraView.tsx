import { CameraView } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CRTScanlines, GlitchText } from './crt';
import { t } from '../i18n';
import { useMissionCamera } from '../hooks/useMissionCamera';
import styles from '../styles/mission';

export interface MissionCameraViewProps {
  agentId: string;
  syncToServer?: boolean;
  onCaptureComplete: (targetUri: string, stealthUri: string | null) => void;
  onCancel: () => void;
  onTaskComplete: () => void;
  showError: (
    message: string,
    buttons?: Array<{ text: string; onPress?: () => void }>,
    title?: string,
  ) => void;
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
            StyleSheet.absoluteFill,
            {
              backgroundColor: '#000',
              paddingTop: insets.top + 24,
              paddingBottom: insets.bottom + 24,
              paddingHorizontal: 24,
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
              <Pressable
                style={styles.cameraButtonCancel}
                onPress={camera.resetCameraFlow}
                accessibilityRole="button"
                accessibilityLabel={t.mission.cameraCancel}
              >
                <Text style={styles.cameraButtonText}>{t.mission.cameraCancel}</Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : null}
      {!isStealthPhase && camera.cameraReady ? (
        <View
          style={[
            styles.cameraOverlay,
            {
              backgroundColor: 'transparent',
              paddingTop: insets.top + 24,
              paddingBottom: insets.bottom + 24,
              paddingHorizontal: 24,
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
            <Pressable
              style={styles.cameraButtonCancel}
              onPress={camera.resetCameraFlow}
              accessibilityRole="button"
              accessibilityLabel={t.mission.cameraCancel}
            >
              <Text style={styles.cameraButtonText}>{t.mission.cameraCancel}</Text>
            </Pressable>
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
