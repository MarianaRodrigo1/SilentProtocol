import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MissionCameraView } from '../components/MissionCameraView';
import { useMissionController } from '../hooks/useMissionController';
import { t } from '../i18n';
import { ActivePhaseView, BriefingPhaseView, CompletePhaseView } from './MissionPhaseViews';

interface MissionScreenProps {
  agentId: string;
  codename: string;
  agentMode: 'online' | 'offline';
  onMissionComplete: (payload: {
    targetPhotoUri: string | null;
    stealthPhotoUri: string | null;
  }) => void;
}

function getSyncStatus(params: {
  agentMode: 'online' | 'offline';
  linkQuality: 'ok' | 'checking' | 'no_network' | 'no_backend';
}): { label: string; color: string } {
  const { agentMode, linkQuality } = params;
  if (agentMode === 'offline') {
    return { label: t.mission.syncLocalFallback, color: '#FF8C00' };
  }
  if (linkQuality === 'checking') {
    return { label: t.mission.syncChecking, color: '#91A5BC' };
  }
  if (linkQuality === 'no_network') {
    return { label: t.mission.syncNoNetwork, color: '#FF8C00' };
  }
  if (linkQuality === 'no_backend') {
    return { label: t.mission.syncNoBackend, color: '#FF8C00' };
  }
  return { label: t.mission.syncLive, color: '#00FF41' };
}

export function MissionScreen({ agentId, codename, agentMode, onMissionComplete }: MissionScreenProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

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

  const syncStatus = getSyncStatus({ agentMode, linkQuality });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [state.currentTaskIndex, fadeAnim]);

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
