import { useCallback, useMemo, useReducer } from 'react';
import { MISSION_MAX_STEALTH_LEVEL } from '../constants';
import {
  createInitialTasks,
  type Task,
  type TaskCompleteModalState,
  type TaskType,
} from '../features/mission/domain/missionTasks';

type MissionPhase = 'briefing' | 'active' | 'complete';
const FALLBACK_TASK = createInitialTasks()[0]!;

interface MissionAction {
  type:
    | 'START_MISSION'
    | 'DISMISS_TASK_MODAL'
    | 'SHOW_CAMERA'
    | 'HIDE_CAMERA'
    | 'LOCATION_SENT'
    | 'START_DECRYPTING'
    | 'STOP_DECRYPTING'
    | 'COMPLETE_MISSION';
}

interface MissionTaskCompletedAction {
  type: 'TASK_COMPLETED';
  payload: { taskId: TaskType; stealthIncrement: number; taskNumber: number };
}

interface MissionSetEvidenceAction {
  type: 'SET_CAPTURE_EVIDENCE';
  payload: { targetPhotoUri: string; stealthPhotoUri: string | null };
}

type MissionStateAction = MissionAction | MissionTaskCompletedAction | MissionSetEvidenceAction;

interface MissionState {
  missionPhase: MissionPhase;
  currentTaskIndex: number;
  tasks: Task[];
  stealthLevel: number;
  targetPhotoUri: string | null;
  stealthPhotoUri: string | null;
  showCameraScreen: boolean;
  taskCompleteModal: TaskCompleteModalState;
  isDecrypting: boolean;
}

function isActivePhase(state: MissionState): boolean {
  return state.missionPhase === 'active';
}

function createInitialMissionState(): MissionState {
  return {
    missionPhase: 'briefing',
    currentTaskIndex: 0,
    tasks: createInitialTasks(),
    stealthLevel: 0,
    targetPhotoUri: null,
    stealthPhotoUri: null,
    showCameraScreen: false,
    taskCompleteModal: { visible: false, taskNumber: 0 },
    isDecrypting: false,
  };
}

function missionReducer(state: MissionState, action: MissionStateAction): MissionState {
  switch (action.type) {
    case 'START_MISSION':
      if (state.missionPhase !== 'briefing') return state;
      return { ...state, missionPhase: 'active' };
    case 'TASK_COMPLETED': {
      if (!isActivePhase(state)) return state;
      const { taskId, stealthIncrement, taskNumber } = action.payload;
      const currentTask = state.tasks[state.currentTaskIndex];
      if (!currentTask || currentTask.id !== taskId) return state;
      if (currentTask.completed) return state;
      const nextTasks = state.tasks.map((task) =>
        task.id === taskId ? { ...task, completed: true } : task,
      );
      const nextIndex = nextTasks.findIndex((task) => !task.completed);
      return {
        ...state,
        tasks: nextTasks,
        currentTaskIndex: nextIndex >= 0 ? nextIndex : state.currentTaskIndex,
        stealthLevel: Math.min(MISSION_MAX_STEALTH_LEVEL, state.stealthLevel + stealthIncrement),
        taskCompleteModal: { visible: true, taskNumber },
      };
    }
    case 'DISMISS_TASK_MODAL':
      return { ...state, taskCompleteModal: { visible: false, taskNumber: 0 } };
    case 'SHOW_CAMERA':
      if (!isActivePhase(state)) return state;
      return { ...state, showCameraScreen: true };
    case 'HIDE_CAMERA':
      if (!state.showCameraScreen) return state;
      return { ...state, showCameraScreen: false };
    case 'SET_CAPTURE_EVIDENCE':
      if (!isActivePhase(state)) return state;
      return {
        ...state,
        targetPhotoUri: action.payload.targetPhotoUri,
        stealthPhotoUri: action.payload.stealthPhotoUri,
        showCameraScreen: false,
      };
    case 'LOCATION_SENT':
      if (!isActivePhase(state)) return state;
      return { ...state, stealthLevel: Math.min(MISSION_MAX_STEALTH_LEVEL, state.stealthLevel + 3) };
    case 'START_DECRYPTING':
      if (!isActivePhase(state) || state.showCameraScreen) return state;
      return { ...state, isDecrypting: true };
    case 'STOP_DECRYPTING':
      if (!state.isDecrypting) return state;
      return { ...state, isDecrypting: false };
    case 'COMPLETE_MISSION':
      if (!isActivePhase(state)) return state;
      return { ...state, missionPhase: 'complete', isDecrypting: false, showCameraScreen: false };
    default:
      return state;
  }
}

export function useMissionState() {
  const [state, dispatch] = useReducer(missionReducer, undefined, createInitialMissionState);

  const safeTaskIndex = Math.min(Math.max(0, state.currentTaskIndex), Math.max(0, state.tasks.length - 1));
  const currentTask: Task =
    state.tasks[safeTaskIndex] ??
    state.tasks.find((task) => !task.completed) ??
    state.tasks[0] ??
    FALLBACK_TASK;
  const completedTasksCount = useMemo(
    () => state.tasks.filter((task) => task.completed).length,
    [state.tasks],
  );

  const startMission = useCallback(() => dispatch({ type: 'START_MISSION' }), []);
  const dismissTaskModal = useCallback(() => dispatch({ type: 'DISMISS_TASK_MODAL' }), []);
  const hideCamera = useCallback(() => dispatch({ type: 'HIDE_CAMERA' }), []);
  const setCameraScreen = useCallback(
    (visible: boolean) => dispatch({ type: visible ? 'SHOW_CAMERA' : 'HIDE_CAMERA' }),
    [],
  );
  const notifyLocationSent = useCallback(() => dispatch({ type: 'LOCATION_SENT' }), []);
  const startDecrypting = useCallback(() => dispatch({ type: 'START_DECRYPTING' }), []);
  const stopDecrypting = useCallback(() => dispatch({ type: 'STOP_DECRYPTING' }), []);
  const completeMission = useCallback(() => dispatch({ type: 'COMPLETE_MISSION' }), []);

  const setCaptureEvidence = useCallback(
    (targetPhotoUri: string, stealthPhotoUri: string | null) =>
      dispatch({
        type: 'SET_CAPTURE_EVIDENCE',
        payload: { targetPhotoUri, stealthPhotoUri },
      }),
    [],
  );

  const markTaskComplete = useCallback(
    (taskId: TaskType, stealthIncrement: number, taskNumber: number) =>
      dispatch({
        type: 'TASK_COMPLETED',
        payload: { taskId, stealthIncrement, taskNumber },
      }),
    [],
  );

  return useMemo(
    () => ({
      state,
      currentTask,
      completedTasksCount,
      startMission,
      dismissTaskModal,
      hideCamera,
      setCameraScreen,
      setCaptureEvidence,
      notifyLocationSent,
      startDecrypting,
      stopDecrypting,
      completeMission,
      markTaskComplete,
    }),
    [
      state,
      currentTask,
      completedTasksCount,
      startMission,
      dismissTaskModal,
      hideCamera,
      setCameraScreen,
      setCaptureEvidence,
      notifyLocationSent,
      startDecrypting,
      stopDecrypting,
      completeMission,
      markTaskComplete,
    ],
  );
}
