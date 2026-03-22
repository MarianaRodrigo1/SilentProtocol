import { useCallback, useEffect, useReducer, useRef } from 'react';
import { createAgent } from '../api/agents';
import { getApiErrorInfo } from '../api/http';
import { t } from '../i18n';
import { createUuidV4 } from '../utils/uuid';

export type WizardStep = 'boot' | 'identity' | 'freezer' | 'deployment';

interface OnboardingState {
  wizardStep: WizardStep;
  bootStep: number;
  codename: string;
  encryptionProgress: number;
  encryptionComplete: boolean;
  isSubmitting: boolean;
}

type OnboardingAction =
  | { type: 'BOOT_ADVANCE'; payload: { maxStep: number } }
  | { type: 'SET_WIZARD_STEP'; payload: WizardStep }
  | { type: 'SET_CODENAME'; payload: string }
  | { type: 'FREEZER_RESET' }
  | { type: 'FREEZER_PROGRESS_TICK'; payload: number }
  | { type: 'SET_SUBMITTING'; payload: boolean };

interface UseOnboardingFlowOptions {
  bootSequenceLength: number;
  onAgentReady: (agentId: string, codename: string, mode: 'online' | 'offline') => void;
  showAlert: (
    title: string,
    message: string,
    buttons?: Array<{ text: string; onPress?: () => void; style?: 'cancel' | 'default' | 'destructive' }>,
  ) => void;
  onAnimateStep: () => void;
}

function createInitialOnboardingState(): OnboardingState {
  return {
    wizardStep: 'boot',
    bootStep: 0,
    codename: '',
    encryptionProgress: 0,
    encryptionComplete: false,
    isSubmitting: false,
  };
}

function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'BOOT_ADVANCE': {
      const next = Math.min(state.bootStep + 1, action.payload.maxStep);
      return { ...state, bootStep: next };
    }
    case 'SET_WIZARD_STEP':
      return { ...state, wizardStep: action.payload };
    case 'SET_CODENAME':
      return { ...state, codename: action.payload };
    case 'FREEZER_RESET':
      return { ...state, encryptionProgress: 0, encryptionComplete: false };
    case 'FREEZER_PROGRESS_TICK': {
      const nextProgress = Math.min(100, state.encryptionProgress + action.payload);
      return {
        ...state,
        encryptionProgress: nextProgress,
        encryptionComplete: nextProgress >= 100,
      };
    }
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.payload };
  }
}

export function useOnboardingFlow({
  bootSequenceLength,
  onAgentReady,
  showAlert,
  onAnimateStep,
}: UseOnboardingFlowOptions) {
  const [state, dispatch] = useReducer(onboardingReducer, undefined, createInitialOnboardingState);
  const bootMaxStep = Math.max(0, bootSequenceLength - 1);

  useEffect(() => {
    if (state.wizardStep !== 'boot') return undefined;

    const tick = setInterval(() => {
      dispatch({ type: 'BOOT_ADVANCE', payload: { maxStep: bootMaxStep } });
    }, 200);

    return () => {
      clearInterval(tick);
    };
  }, [bootMaxStep, state.wizardStep]);

  useEffect(() => {
    if (state.wizardStep !== 'boot') return undefined;
    if (state.bootStep < bootMaxStep) return undefined;
    const completionTimer = setTimeout(() => {
      dispatch({ type: 'SET_WIZARD_STEP', payload: 'identity' });
    }, 800);
    return () => clearTimeout(completionTimer);
  }, [bootMaxStep, state.bootStep, state.wizardStep]);

  const onAnimateStepRef = useRef(onAnimateStep);
  onAnimateStepRef.current = onAnimateStep;
  const prevWizardStepRef = useRef(state.wizardStep);
  useEffect(() => {
    if (prevWizardStepRef.current === state.wizardStep) return;
    prevWizardStepRef.current = state.wizardStep;
    onAnimateStepRef.current();
  }, [state.wizardStep]);

  useEffect(() => {
    if (state.wizardStep !== 'freezer') return undefined;

    dispatch({ type: 'FREEZER_RESET' });
    const interval = setInterval(() => {
      dispatch({ type: 'FREEZER_PROGRESS_TICK', payload: Math.random() * 5 + 2 });
    }, 100);
    return () => clearInterval(interval);
  }, [state.wizardStep]);

  const setCodename = useCallback((value: string) => {
    dispatch({ type: 'SET_CODENAME', payload: value });
  }, []);

  const handleIdentityNext = useCallback(() => {
    const normalized = state.codename.trim().toUpperCase();
    if (!normalized || normalized.length < 3) {
      showAlert(t.onboarding.invalidInputTitle, t.onboarding.invalidCodenameMsg);
      return;
    }
    dispatch({ type: 'SET_WIZARD_STEP', payload: 'freezer' });
  }, [showAlert, state.codename]);

  const handleFreezerNext = useCallback(() => {
    if (!state.encryptionComplete) {
      showAlert(t.onboarding.encryptionInProgressTitle, t.onboarding.encryptionWaitMsg);
      return;
    }
    dispatch({ type: 'SET_WIZARD_STEP', payload: 'deployment' });
  }, [showAlert, state.encryptionComplete]);

  const beginMissionLocalFallback = useCallback(
    (normalizedCodename: string) => {
      onAgentReady(createUuidV4(), normalizedCodename, 'offline');
    },
    [onAgentReady],
  );

  const handleDeployment = useCallback(async () => {
    const normalizedCodename = state.codename.trim().toUpperCase();
    try {
      dispatch({ type: 'SET_SUBMITTING', payload: true });
      const agent = await createAgent({
        codename: normalizedCodename,
        biometric_confirmed: true,
        terms_accepted: true,
      });
      onAgentReady(agent.id, normalizedCodename, 'online');
    } catch (error) {
      const apiError = getApiErrorInfo(error);
      const serverRejectedRequest = apiError.kind === 'http_client';
      if (!serverRejectedRequest) {
        beginMissionLocalFallback(normalizedCodename);
        return;
      }
      const detail =
        apiError.message && apiError.kind !== 'unknown'
          ? `\n\n(${apiError.message})`
          : '';
      showAlert(t.onboarding.errorTitle, `${t.onboarding.errorDescription}${detail}`, [
        { text: t.onboarding.continueOfflineBtn, onPress: () => beginMissionLocalFallback(normalizedCodename) },
        { text: t.onboarding.errorDismiss, style: 'cancel' },
      ]);
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false });
    }
  }, [beginMissionLocalFallback, onAgentReady, showAlert, state.codename]);

  const safeBootLength = Math.max(1, bootSequenceLength);
  const bootProgress = Math.round(((state.bootStep + 1) / safeBootLength) * 100);

  return {
    state,
    bootProgress,
    setCodename,
    handleIdentityNext,
    handleFreezerNext,
    handleDeployment,
  };
}
