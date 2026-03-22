import { Modal, Pressable, StyleSheet, Text } from 'react-native';
import { GlitchText } from './crt';
import { t } from '../i18n';
import { palette, typography, spacing, radius } from '../styles/theme';

const ACK_MESSAGES = [t.taskComplete.ack1, t.taskComplete.ack2, t.taskComplete.ack3, t.taskComplete.ack4];

interface TaskCompleteModalProps {
  visible: boolean;
  taskNumber: number;
  onDismiss: () => void;
  onDismissCallback?: (taskNumber: number) => void;
}

export function TaskCompleteModal({ visible, taskNumber, onDismiss, onDismissCallback }: TaskCompleteModalProps) {
  const handleDismiss = () => {
    onDismiss();
    onDismissCallback?.(taskNumber);
  };
  const ackIndex = Math.max(0, Math.min(taskNumber - 1, ACK_MESSAGES.length - 1));
  const ackMessage = ACK_MESSAGES[ackIndex] ?? ACK_MESSAGES[0];
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <Pressable style={styles.backdrop} onPress={handleDismiss}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          <GlitchText
            style={styles.title}
            glitchIntensity="medium"
          >
            {t.taskComplete.ackReceived}
          </GlitchText>
          <Text style={styles.message}>
            {ackMessage}
          </Text>
          <Pressable onPress={handleDismiss} style={styles.button}>
            <Text style={styles.buttonText}>
              {t.taskComplete.continueBtn}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
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
