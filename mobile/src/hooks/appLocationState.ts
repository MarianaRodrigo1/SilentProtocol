import type { AppStateStatus } from 'react-native';

export function isAppEligibleForForegroundLocation(state: AppStateStatus): boolean {
  return state === 'active';
}
