import { StyleSheet } from 'react-native';
import { palette, spacing, typography } from './theme';

export const shellStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bgPrimary,
  },
  safeArea: {
    flex: 1,
  },
});

export const appErrorBoundaryStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: palette.bgSecondary,
  },
  message: {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.md,
    color: palette.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
});
