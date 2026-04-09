import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MissionCameraView } from '../components/MissionCameraView';
import type { MissionLinkQuality } from '../features/mission/domain/missionTasks';
import type { AgentConnectivityMode, LocalEvidence } from '../features/session/session.types';
import { useMissionController } from '../hooks/useMissionController';
import { useFadeInSequence } from '../hooks/useFadeInSequence';
import { t } from '../i18n';
import { palette } from '../styles/theme';
import { ActivePhaseView, BriefingPhaseView, CompletePhaseView } from './MissionPhaseViews';

function missionSyncStatusLabel(params: {
  agentMode: AgentConnectivityMode;
  linkQuality: MissionLinkQuality;
}): { label: string; color: string } {
  const { agentMode, linkQuality } = params;
  if (agentMode === 'offline') {
    return { label: t.mission.syncLocalFallback, color: palette.warningAmber };
  }
  if (linkQuality === 'checking') {
    return { label: t.mission.syncChecking, color: palette.terminalSlate };
  }
  if (linkQuality === 'no_network') {
    return { label: t.mission.syncNoNetwork, color: palette.warningAmber };
  }
  if (linkQuality === 'no_backend') {
    return { label: t.mission.syncNoBackend, color: palette.warningAmber };
  }
  return { label: t.mission.syncLive, color: palette.matrixGreen };
}

interface MissionScreenProps {
  agentId: string;
  codename: string;
  agentMode: AgentConnectivityMode;
  onMissionComplete: (payload: LocalEvidence) => void;
}

export function MissionScreen({ agentId, codename, agentMode, onMissionComplete }: MissionScreenProps) {
  const insets = useSafeAreaInsets();
  const { opacity: fadeAnim, trigger: triggerFadeIn } = useFadeInSequence();

  const {
    shouldSyncToServer,
    linkQuality,
    permissions,
    mission,
    isSubmitting,
    startMission,
    executeCurrentTask,
    onTaskModalDismiss,
    onCameraCaptureComplete,
    onCameraTaskComplete,
  } = useMissionController({
    agentId,
    agentMode,
    onMissionComplete,
  });
  const { state } = mission;

  const syncStatus = missionSyncStatusLabel({ agentMode, linkQuality });

  useEffect(() => {
    triggerFadeIn();
  }, [state.currentTaskIndex, triggerFadeIn]);

  if (state.showCameraScreen) {
    return (
      <MissionCameraView
        agentId={agentId}
        syncToServer={shouldSyncToServer}
        onCaptureComplete={onCameraCaptureComplete}
        onCancel={mission.hideCamera}
        onTaskComplete={onCameraTaskComplete}
        showError={permissions.showError}
      />
    );
  }

  if (state.missionPhase === 'briefing') {
    return (
      <BriefingPhaseView
        codename={codename}
        topPadding={Math.max(24, insets.top + 16)}
        onStartMission={() => {
          void startMission();
        }}
      />
    );
  }

  if (state.missionPhase === 'complete') {
    return (
      <CompletePhaseView
        taskModal={state.taskCompleteModal}
        stealthLevel={state.stealthLevel}
        onDismissTaskModal={mission.dismissTaskModal}
      />
    );
  }

  return (
    <ActivePhaseView
      topPadding={Math.max(18, insets.top + 8)}
      syncStatusLabel={syncStatus.label}
      syncStatusColor={syncStatus.color}
      codename={codename}
      taskModal={state.taskCompleteModal}
      onDismissTaskModal={mission.dismissTaskModal}
      onTaskModalDismissCallback={onTaskModalDismiss}
      completedTasksCount={mission.completedTasksCount}
      isDecrypting={state.isDecrypting}
      fadeAnim={fadeAnim}
      currentTask={mission.currentTask}
      tasks={state.tasks}
      currentTaskIndex={state.currentTaskIndex}
      stealthLevel={state.stealthLevel}
      isSubmitting={isSubmitting}
      onExecuteCurrentTask={executeCurrentTask}
    />
  );
}
