import { StyleSheet } from 'react-native';
import { palette, spacing, typography } from './theme';

export const crtMotion = {
  encryptionGlitchHalfCycleMs: 100,
  scanlineSweepDurationMs: 8000,
  scanlineSweepResetMs: 0,
  scanlineCount: 50,
  movingScanlineHeight: 3,
  movingScanlineTranslateMin: -100,
  movingScanlineTranslateMax: 1000,
  movingScanlineShadowOpacity: 0.8,
  movingScanlineShadowRadius: 10,
  vignetteBorderWidth: 60,
  progressBarHeight: 20,
  progressBarBorderWidth: 1,
  progressTickWidth: 1,
  scanlineStrokeHeight: 1,
  progressTickCount: 10,
  progressTicksOpacity: 0.3,
  progressTicksPaddingH: 2,
  progressStatMarginTop: 4,
  hashChars: '0123456789ABCDEF',
  hashMaxLength: 32,
  hashSeedModulo: 16,
  hashProgressMultiplier: 31,
  labelOpacityMin: 0.7,
  labelOpacityMax: 1,
  percentageOpacityMin: 0.8,
  percentageOpacityMax: 1,
  hashOpacityMin: 0.6,
  hashOpacityMax: 0.9,
  glitchIntensityBaseMs: { low: 5000, medium: 2000, high: 800 } as const,
  glitchIntervalJitterMs: 2000,
  glitchPulseMs: 50,
  glitchTranslateMax: 5,
  glitchOpacityMid: 0.7,
  terminalCursorBlinkHalfMs: 500,
  terminalCursorWidth: 10,
  terminalCursorHeight: 20,
  terminalCursorMarginLeft: 2,
} as const;

export const encryptionProgressStyles = StyleSheet.create({
  progressContainer: {
    width: '100%',
    paddingVertical: spacing.md,
  },
  progressLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.sm,
    color: palette.matrixGreen,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  progressBarContainer: {
    height: crtMotion.progressBarHeight,
    backgroundColor: palette.bgCard,
    borderWidth: crtMotion.progressBarBorderWidth,
    borderColor: palette.borderPrimary,
    position: 'relative',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: palette.matrixGreen,
    position: 'relative',
  },
  progressGlitch: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.textSecondary,
  },
  progressTicks: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: crtMotion.progressTicksPaddingH,
  },
  progressTick: {
    width: crtMotion.progressTickWidth,
    height: '100%',
    backgroundColor: palette.bgPrimary,
    opacity: crtMotion.progressTicksOpacity,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: crtMotion.progressStatMarginTop,
  },
  progressPercentage: {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.md,
    color: palette.matrixGreen,
    fontWeight: typography.fontWeights.bold,
  },
  progressHash: {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.xs,
    color: palette.textMuted,
    flex: 1,
    marginLeft: spacing.md,
  },
});

export const crtScanlineStyles = StyleSheet.create({
  scanlinesContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  scanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: crtMotion.scanlineStrokeHeight,
    backgroundColor: palette.scanline,
  },
  movingScanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: crtMotion.movingScanlineHeight,
    backgroundColor: palette.matrixGreenGlow,
    shadowColor: palette.matrixGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: crtMotion.movingScanlineShadowOpacity,
    shadowRadius: crtMotion.movingScanlineShadowRadius,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    borderWidth: crtMotion.vignetteBorderWidth,
    borderColor: palette.overlayDark,
  },
  crtGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.crtGlow,
  },
});

export const terminalCursorStyles = StyleSheet.create({
  cursor: {
    width: crtMotion.terminalCursorWidth,
    height: crtMotion.terminalCursorHeight,
    backgroundColor: palette.matrixGreen,
    marginLeft: crtMotion.terminalCursorMarginLeft,
  },
});
