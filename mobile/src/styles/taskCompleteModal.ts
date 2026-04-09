import { StyleSheet } from 'react-native';
import { palette, typography, spacing, radius } from './theme';

export const taskCompleteModalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: palette.modalBackdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  container: {
    backgroundColor: palette.bgCard,
    borderWidth: 2,
    borderColor: palette.matrixGreen,
    borderRadius: radius.md,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 320,
    shadowColor: palette.matrixGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.xl,
    color: palette.matrixGreen,
    textAlign: 'center',
    marginBottom: spacing.md,
    letterSpacing: 2,
  },
  message: {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.md,
    color: palette.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  button: {
    borderWidth: 2,
    borderColor: palette.matrixGreen,
    padding: spacing.md,
    borderRadius: radius.sm,
  },
  buttonText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.md,
    color: palette.matrixGreen,
    textAlign: 'center',
    letterSpacing: 1,
  },
});
