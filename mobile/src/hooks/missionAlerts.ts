import { Alert } from 'react-native';
import { t } from '../i18n';

export function showMissionObjectiveAlert(title: string, message: string): void {
  Alert.alert(title, message, [{ text: t.onboarding.continueBtn }]);
}
