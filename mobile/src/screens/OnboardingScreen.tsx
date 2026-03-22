import { useCallback, useRef } from 'react';
import { Alert, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnboardingFlow } from '../hooks/useOnboardingFlow';
import { t } from '../i18n';
import { spacing } from '../styles/theme';
import {
  BootStepView,
  DeploymentStepView,
  FreezerStepView,
  IdentityStepView,
  OnboardingBaseScreen,
} from './onboarding/OnboardingStepViews';

interface OnboardingScreenProps {
  onAgentReady: (agentId: string, codename: string, mode: 'online' | 'offline') => void;
}

export function OnboardingScreen({ onAgentReady }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const bootSequence = t.onboarding.bootSequence;
  const wizardTopPadding = Math.max(spacing.xxl * 2, insets.top + 16);
  const sharedWizardScrollProps = {
    showsVerticalScrollIndicator: true as const,
    keyboardShouldPersistTaps: 'handled' as const,
    keyboardDismissMode: 'on-drag' as const,
  };
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const animateStep = useCallback(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const {
    state,
    bootProgress,
    setCodename,
    handleIdentityNext,
    handleFreezerNext,
    handleDeployment,
  } = useOnboardingFlow({
    bootSequenceLength: bootSequence.length,
    onAgentReady,
    showAlert: (title, message, buttons) => {
      Alert.alert(title, message, buttons);
    },
    onAnimateStep: animateStep,
  });

  if (state.wizardStep === 'boot') {
    return (
      <OnboardingBaseScreen>
        <BootStepView
          topInset={insets.top}
          bootProgress={bootProgress}
          bootMessage={bootSequence[state.bootStep]}
        />
      </OnboardingBaseScreen>
    );
  }

  if (state.wizardStep === 'identity') {
    return (
      <OnboardingBaseScreen>
        <IdentityStepView
          fadeAnim={fadeAnim}
          wizardTopPadding={wizardTopPadding}
          sharedWizardScrollProps={sharedWizardScrollProps}
          codename={state.codename}
          onCodenameChange={setCodename}
          onNext={handleIdentityNext}
        />
      </OnboardingBaseScreen>
    );
  }

  if (state.wizardStep === 'freezer') {
    return (
      <OnboardingBaseScreen>
        <FreezerStepView
          fadeAnim={fadeAnim}
          wizardTopPadding={wizardTopPadding}
          sharedWizardScrollProps={sharedWizardScrollProps}
          encryptionProgress={state.encryptionProgress}
          encryptionComplete={state.encryptionComplete}
          onNext={handleFreezerNext}
        />
      </OnboardingBaseScreen>
    );
  }

  if (state.wizardStep === 'deployment') {
    return (
      <OnboardingBaseScreen>
        <DeploymentStepView
          fadeAnim={fadeAnim}
          wizardTopPadding={wizardTopPadding}
          sharedWizardScrollProps={sharedWizardScrollProps}
          codename={state.codename}
          isSubmitting={state.isSubmitting}
          onDeploy={() => {
            void handleDeployment();
          }}
        />
      </OnboardingBaseScreen>
    );
  }

  return null;
}