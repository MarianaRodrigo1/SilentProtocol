import { Modal, Pressable, Text } from 'react-native';
import { GlitchText } from './crt';
import { t } from '../i18n';
import { taskCompleteModalStyles as styles } from '../styles/taskCompleteModal';

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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <Pressable style={styles.backdrop} onPress={handleDismiss}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          <GlitchText style={styles.title} glitchIntensity="medium">
            {t.taskComplete.ackReceived}
          </GlitchText>
          <Text style={styles.message}>{ackMessage}</Text>
          <Pressable onPress={handleDismiss} style={styles.button}>
            <Text style={styles.buttonText}>{t.taskComplete.continueBtn}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
