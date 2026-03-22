import { StyleSheet } from 'react-native';
import { palette, typography, spacing, radius } from './theme';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bgPrimary,
  },
  safeArea: {
    flex: 1,
  },

  bootContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xl,
  },
  bootHeader: {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.xl,
    color: palette.matrixGreen,
    marginBottom: spacing.xxl,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  bootSequenceText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.md,
    color: palette.textTerminal,
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  bootProgressContainer: {
    width: '100%',
    marginTop: spacing.xxl,
  },
  bootProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: palette.bgCard,
    borderRadius: 2,
    overflow: 'hidden',
  },
  bootProgressFill: {
    height: '100%',
    backgroundColor: palette.matrixGreen,
    shadowColor: palette.matrixGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  bootProgressText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.sm,
    color: palette.textMuted,
    marginTop: spacing.sm,
  },

  wizardScrollView: {
    flex: 1,
  },
  wizardScrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl * 2,
    paddingBottom: spacing.xxl * 2,
  },
  wizardContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl * 2,
    paddingBottom: spacing.xxl * 2,
  },
  wizardHeader: {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.xxl,
    color: palette.matrixGreen,
    textAlign: 'center',
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  wizardWarning: {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.xs,
    color: palette.alertRed,
    textAlign: 'center',
    marginTop: spacing.xl,
    letterSpacing: 1,
  },

  terminalCard: {
    backgroundColor: palette.bgCard,
    borderWidth: 1,
    borderColor: palette.borderPrimary,
    borderRadius: radius.sm,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: palette.matrixGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  terminalPrompt: {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.md,
    color: palette.matrixGreen,
    marginBottom: spacing.md,
  },
  terminalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: palette.matrixGreen,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  terminalInputPrefix: {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.lg,
    color: palette.matrixGreen,
    marginRight: spacing.sm,
  },
  terminalInput: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.lg,
    color: palette.textSecondary,
    padding: 0,
    margin: 0,
    height: 30,
  },
  terminalHint: {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.xs,
    color: palette.textMuted,
    marginTop: spacing.sm,
  },

  terminalButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: palette.matrixGreen,
    padding: spacing.lg,
    borderRadius: radius.sm,
    marginTop: spacing.lg,
    shadowColor: palette.matrixGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  terminalButtonDisabled: {
    borderColor: palette.textMuted,
    shadowOpacity: 0,
  },
  terminalButtonText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.md,
    color: palette.matrixGreen,
    textAlign: 'center',
    letterSpacing: 1,
  },

  freezerCard: {
    backgroundColor: palette.bgCard,
    borderWidth: 2,
    borderColor: palette.borderPrimary,
    borderRadius: radius.sm,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    maxHeight: 220,
  },
  freezerScrollContainer: {
    maxHeight: 200,
  },
  freezerScrollContent: {
    padding: spacing.lg,
  },
  freezerTermText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.sm,
    color: palette.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  freezerEnd: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: palette.borderPrimary,
    marginTop: spacing.lg,
  },
  freezerEndText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.md,
    color: palette.matrixGreen,
    marginVertical: spacing.sm,
  },
  encryptionContainer: {
    marginBottom: spacing.lg,
  },

  deploymentScrollView: {
    flex: 1,
  },
  deploymentScrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl * 2,
    paddingBottom: spacing.xxl * 2,
  },

  deploymentTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.lg,
    color: palette.matrixGreen,
    marginBottom: spacing.md,
    letterSpacing: 1,
  },
  deploymentText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.md,
    color: palette.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  agentProfileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderSecondary,
    marginBottom: spacing.sm,
  },
  agentProfileLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.sm,
    color: palette.textMuted,
  },
  agentProfileValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.md,
    color: palette.matrixGreen,
    fontWeight: typography.fontWeights.bold,
  },
});
