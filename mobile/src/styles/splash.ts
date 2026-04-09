import { StyleSheet } from 'react-native';
import { palette, typography } from './theme';

export const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bgPrimary,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  content: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.xxl,
    color: palette.matrixGreen,
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.xs,
    color: palette.textMuted,
    letterSpacing: 2,
  },
});
