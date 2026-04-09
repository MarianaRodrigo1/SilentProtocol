import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import { t } from '../i18n';
import type { PermissionFlowResult } from '../types/missionRuntime';

export function useMissionPermissions() {
  const showError = useCallback(
    (
      message: string,
      buttons?: { text: string; onPress?: () => void }[],
      title: string = t.mission.locationError,
    ) => Alert.alert(title, message, buttons),
    [],
  );

  const showPermissionRequiredAlert = useCallback(
    () =>
      Alert.alert(t.mission.permissionRequired, t.mission.permissionRequiredMsg, [
        { text: t.onboarding.continueBtn },
      ]),
    [],
  );

  const showPermissionBlockedAlert = useCallback((message: string) => {
    Alert.alert(t.mission.permissionBlocked, message, [
      { text: t.mission.cameraSettingsCancel, style: 'cancel' },
      { text: t.mission.cameraSettingsOpen, onPress: () => Linking.openSettings() },
    ]);
  }, []);

  const handlePermissionDenied = useCallback(
    (
      canAskAgain: boolean,
      blockedMessage: string,
      onDenied: () => void = showPermissionRequiredAlert,
    ): void => {
      if (!canAskAgain) {
        showPermissionBlockedAlert(blockedMessage);
      } else {
        onDenied();
      }
    },
    [showPermissionBlockedAlert, showPermissionRequiredAlert],
  );

  const handlePermissionFlowResult = useCallback(
    (
      permission: PermissionFlowResult,
      blockedMessage: string,
      onDenied: () => void = showPermissionRequiredAlert,
    ): boolean => {
      if (permission === 'granted') return true;
      if (permission === 'blocked') {
        showPermissionBlockedAlert(blockedMessage);
        return false;
      }
      onDenied();
      return false;
    },
    [showPermissionBlockedAlert, showPermissionRequiredAlert],
  );

  return {
    showError,
    handlePermissionDenied,
    handlePermissionFlowResult,
  };
}
