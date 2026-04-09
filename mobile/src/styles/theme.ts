import { Platform } from 'react-native';

export const palette = {
  bgPrimary: '#000000',
  bgSecondary: '#0A0A0A',
  bgCard: '#1A1A1A',
  matrixGreen: '#00FF41',
  matrixGreenGlow: 'rgba(0, 255, 65, 0.2)',
  alertRed: '#FF3131',
  borderPrimary: 'rgba(0, 255, 65, 0.3)',
  borderSecondary: 'rgba(0, 255, 65, 0.15)',
  borderDanger: 'rgba(255, 49, 49, 0.4)',
  textSecondary: '#FFFFFF',
  textMuted: '#888888',
  textTerminal: '#00FF41',
  scanline: 'rgba(0, 255, 65, 0.03)',
  crtGlow: 'rgba(0, 255, 65, 0.1)',
  terminalSlate: '#91A5BC',
  warningAmber: '#FF8C00',
  cautionGold: '#FFD700',
  briefingGold: '#c9a227',
  inputPlaceholder: '#333333',
  overlayDark: 'rgba(0, 0, 0, 0.4)',
  overlayCamera: 'rgba(0, 0, 0, 0.3)',
  modalBackdrop: 'rgba(0, 0, 0, 0.9)',
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 4,
  md: 6,
  lg: 8,
};

export const typography = {
  fontFamily: Platform.select({
    ios: 'Courier New',
    android: 'monospace',
    web: '"Courier New", Courier, monospace',
    default: 'monospace',
  }),
  fontSizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 24,
    xxxl: 32,
  },
  fontWeights: {
    regular: '400' as const,
    bold: '700' as const,
  },
};
