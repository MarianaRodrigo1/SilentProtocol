import { Animated, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { CrtScreenShell } from '../components/layout/CrtScreenShell';
import { GlitchText } from '../components/crt';
import { TaskCompleteModal } from '../components/TaskCompleteModal';
import type { Task, TaskCompleteModalState } from '../features/mission/domain/missionTasks';
import { t } from '../i18n';
import styles from '../styles/mission';

interface BriefingPhaseViewProps {
  codename: string;
  topPadding: number;
  onStartMission: () => void;
}

export function BriefingPhaseView({ codename, topPadding, onStartMission }: BriefingPhaseViewProps) {
  return (
    <CrtScreenShell>
      <ScrollView
        style={styles.briefingScrollView}
        contentContainerStyle={[styles.briefingContainer, { paddingTop: topPadding }]}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        <GlitchText style={styles.briefingHeader} glitchIntensity="medium">
          {t.mission.briefingHeader}
        </GlitchText>

        <View style={styles.briefingCard}>
          <Text style={styles.briefingAgentLabel}>{t.mission.briefingAgentLabel}</Text>
          <Text style={styles.briefingAgentName}>{codename}</Text>
          <Text style={styles.briefingStatus}>{t.mission.briefingStatus}</Text>
        </View>

        <View style={styles.briefingCard}>
          <Text style={styles.briefingTitle}>{t.mission.briefingMissionParams}</Text>
          <Text style={styles.briefingText}>{t.mission.briefingParam1}</Text>
          <Text style={styles.briefingText}>{t.mission.briefingParam2}</Text>
          <Text style={styles.briefingTextClassified}>{t.mission.briefingParamClassified}</Text>
          {Platform.OS === 'web' ? (
            <Text style={styles.briefingWebNote}>{t.mission.briefingWebLocationNote}</Text>
          ) : null}

          <Text style={styles.briefingProtocolTitle}>{t.mission.briefingProtocol}</Text>
          <Text style={styles.briefingText}>{t.mission.protocolAwait}</Text>
          <Text style={styles.briefingText}>{t.mission.protocolExecute}</Text>
          <Text style={styles.briefingText}>{t.mission.protocolStandBy}</Text>
        </View>

        <Pressable style={styles.briefingButton} onPress={onStartMission}>
          <Text style={styles.briefingButtonText}>{t.mission.briefingStartMission}</Text>
        </Pressable>
      </ScrollView>
    </CrtScreenShell>
  );
}

interface CompletePhaseViewProps {
  taskModal: TaskCompleteModalState;
  stealthLevel: number;
  onDismissTaskModal: () => void;
}

export function CompletePhaseView({ taskModal, stealthLevel, onDismissTaskModal }: CompletePhaseViewProps) {
  return (
    <CrtScreenShell>
      <TaskCompleteModal
        visible={taskModal.visible}
        taskNumber={taskModal.taskNumber}
        onDismiss={onDismissTaskModal}
      />
      <View style={styles.completeContainer}>
        <GlitchText style={styles.completeHeader} glitchIntensity="high">
          {t.mission.completeHeader}
        </GlitchText>
        <Text style={styles.completeText}>{t.mission.completeTransmitting}</Text>
        <Text style={styles.completeText}>{t.mission.completeStealthLevel(stealthLevel)}</Text>
        <Text style={styles.completeTextSyncNote}>{t.mission.completeSyncing}</Text>
      </View>
    </CrtScreenShell>
  );
}

interface ActivePhaseViewProps {
  topPadding: number;
  syncStatusLabel: string;
  syncStatusColor: string;
  codename: string;
  taskModal: TaskCompleteModalState;
  onDismissTaskModal: () => void;
  onTaskModalDismissCallback: (taskNumber: number) => void;
  completedTasksCount: number;
  isDecrypting: boolean;
  fadeAnim: Animated.Value;
  currentTask: Task;
  tasks: Task[];
  currentTaskIndex: number;
  stealthLevel: number;
  isSubmitting: boolean;
  onExecuteCurrentTask: () => void;
}

export function ActivePhaseView({
  topPadding,
  syncStatusLabel,
  syncStatusColor,
  codename,
  taskModal,
  onDismissTaskModal,
  onTaskModalDismissCallback,
  completedTasksCount,
  isDecrypting,
  fadeAnim,
  currentTask,
  tasks,
  currentTaskIndex,
  stealthLevel,
  isSubmitting,
  onExecuteCurrentTask,
}: ActivePhaseViewProps) {
  const totalSteps = tasks.length;

  return (
    <CrtScreenShell>
      <TaskCompleteModal
        visible={taskModal.visible}
        taskNumber={taskModal.taskNumber}
        onDismiss={onDismissTaskModal}
        onDismissCallback={onTaskModalDismissCallback}
      />
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <GlitchText style={styles.headerTitle} glitchIntensity="low">
          {t.mission.headerTitle}
        </GlitchText>
        <View style={styles.headerInfo}>
          <Text style={styles.headerAgent}>{t.mission.headerAgent(codename)}</Text>
          <Text style={styles.headerStatus}>
            {t.mission.headerSyncAck(completedTasksCount)} {t.mission.headerStep(currentTask.number, totalSteps)}
          </Text>
        </View>
        <Text style={[styles.headerSyncStrip, { color: syncStatusColor }]}>{syncStatusLabel}</Text>
      </View>
      <ScrollView
        style={styles.taskScrollView}
        contentContainerStyle={styles.taskContainer}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        {isDecrypting ? (
          <View style={styles.taskCard}>
            <GlitchText style={styles.taskTitle} glitchIntensity="medium">
              {t.mission.decryptingTitle}
            </GlitchText>
            <Text style={styles.taskDecryptInstructions}>{t.mission.decryptingReceiving}</Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.taskCard}>
              <Text style={styles.taskTitle}>{currentTask.title}</Text>
              <View style={styles.taskMetaRow}>
                <Text style={styles.taskMetaText}>{t.mission.headerStep(currentTask.number, totalSteps)}</Text>
              </View>
              <Text style={styles.taskObjective}>{currentTask.objective}</Text>
              <Text style={styles.taskInstructions}>{currentTask.instructions}</Text>
            </View>
            {tasks[0].completed && (
              <View style={styles.stealthCard}>
                <Text style={styles.stealthLabel}>{t.mission.stealthLabel}</Text>
                <View style={styles.stealthMeterContainer}>
                  <View style={[styles.stealthMeterFill, { width: `${stealthLevel}%` }]} />
                </View>
                <Text style={styles.stealthValue}>{stealthLevel.toFixed(0)}%</Text>
              </View>
            )}
            <Pressable
              style={[styles.taskButton, isSubmitting && styles.taskButtonDisabled]}
              onPress={onExecuteCurrentTask}
              disabled={isSubmitting}
            >
              <Text style={styles.taskButtonText}>
                {isSubmitting ? t.mission.processing : t.mission.executeEnter}
              </Text>
            </Pressable>
            <View style={styles.progressIndicator}>
              {tasks.map((task, index) => (
                <View
                  key={task.id}
                  style={[
                    styles.progressDot,
                    task.completed && styles.progressDotComplete,
                    index === currentTaskIndex && styles.progressDotActive,
                  ]}
                />
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </CrtScreenShell>
  );
}
