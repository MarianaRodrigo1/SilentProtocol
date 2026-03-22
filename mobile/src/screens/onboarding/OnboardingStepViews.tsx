import { StatusBar } from 'expo-status-bar';
import { ReactNode } from 'react';
import { Animated, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CRTScanlines, EncryptionProgress, GlitchText, TerminalCursor } from '../../components/crt';
import { t } from '../../i18n';
import styles from '../../styles/onboarding';

interface BaseScreenProps {
  children: ReactNode;
}

export function OnboardingBaseScreen({ children }: BaseScreenProps) {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <CRTScanlines />
        {children}
      </SafeAreaView>
    </View>
  );
}

interface SharedWizardScrollProps {
  showsVerticalScrollIndicator: true;
  keyboardShouldPersistTaps: 'handled';
  keyboardDismissMode: 'on-drag';
}

interface BootStepViewProps {
  topInset: number;
  bootProgress: number;
  bootMessage: string;
}

export function BootStepView({ topInset, bootProgress, bootMessage }: BootStepViewProps) {
  return (
    <View style={[styles.bootContainer, { marginTop: topInset }]}>
      <GlitchText style={styles.bootHeader} glitchIntensity="high">
        [SILENT PROTOCOL v1.0]
      </GlitchText>
      <Text style={styles.bootSequenceText}>
        {'> '}
        {bootMessage}
        <TerminalCursor />
      </Text>
      <View style={styles.bootProgressContainer}>
        <View style={styles.bootProgressBar}>
          <View style={[styles.bootProgressFill, { width: `${bootProgress}%` }]} />
        </View>
        <Text style={styles.bootProgressText}>
          {t.onboarding.bootInitializing} {bootProgress}%
        </Text>
      </View>
    </View>
  );
}

interface IdentityStepViewProps {
  fadeAnim: Animated.Value;
  wizardTopPadding: number;
  sharedWizardScrollProps: SharedWizardScrollProps;
  codename: string;
  onCodenameChange: (value: string) => void;
  onNext: () => void;
}

export function IdentityStepView({
  fadeAnim,
  wizardTopPadding,
  sharedWizardScrollProps,
  codename,
  onCodenameChange,
  onNext,
}: IdentityStepViewProps) {
  return (
    <ScrollView
      style={styles.wizardScrollView}
      contentContainerStyle={[styles.wizardScrollContent, { paddingTop: wizardTopPadding }]}
      {...sharedWizardScrollProps}
    >
      <Animated.View style={{ opacity: fadeAnim }}>
        <GlitchText style={styles.wizardHeader} glitchIntensity="medium">
          [{t.onboarding.identityHeader}]
        </GlitchText>

        <View style={styles.terminalCard}>
          <Text style={styles.terminalPrompt}>{t.onboarding.enterCodename}:</Text>
          <View style={styles.terminalInputContainer}>
            <Text style={styles.terminalInputPrefix}>$_</Text>
            <TextInput
              value={codename}
              onChangeText={onCodenameChange}
              placeholder={t.onboarding.codenamePlaceholder}
              placeholderTextColor="#333333"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
              style={styles.terminalInput}
            />
            <TerminalCursor visible={codename.length > 0} />
          </View>
          <Text style={styles.terminalHint}>
            [{t.onboarding.codenameHint}]
          </Text>
        </View>

        <Pressable
          style={[styles.terminalButton, !codename.trim() && styles.terminalButtonDisabled]}
          onPress={onNext}
          disabled={!codename.trim()}
        >
          <Text style={styles.terminalButtonText}>{t.onboarding.proceedToTerms}</Text>
        </Pressable>

        <Text style={styles.wizardWarning}>[{t.onboarding.warningLogged}]</Text>
      </Animated.View>
    </ScrollView>
  );
}

interface FreezerStepViewProps {
  fadeAnim: Animated.Value;
  wizardTopPadding: number;
  sharedWizardScrollProps: SharedWizardScrollProps;
  encryptionProgress: number;
  encryptionComplete: boolean;
  onNext: () => void;
}

export function FreezerStepView({
  fadeAnim,
  wizardTopPadding,
  sharedWizardScrollProps,
  encryptionProgress,
  encryptionComplete,
  onNext,
}: FreezerStepViewProps) {
  return (
    <ScrollView
      style={styles.wizardScrollView}
      contentContainerStyle={[styles.wizardScrollContent, { paddingTop: wizardTopPadding }]}
      {...sharedWizardScrollProps}
    >
      <Animated.View style={[styles.wizardContainer, { opacity: fadeAnim }]}>
        <GlitchText style={styles.wizardHeader} glitchIntensity="low">
          [{t.onboarding.legalProxyHeader}]
        </GlitchText>

        <View style={styles.freezerCard}>
          <ScrollView
            style={styles.freezerScrollContainer}
            contentContainerStyle={styles.freezerScrollContent}
            showsVerticalScrollIndicator
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {t.onboarding.absurdTerms.map((term, index) => (
              <Text key={index} style={styles.freezerTermText}>
                {term}
              </Text>
            ))}

            <View style={styles.freezerEnd}>
              <GlitchText style={styles.freezerEndText} glitchIntensity="high">
                {t.onboarding.endOfDocument}
              </GlitchText>
              <Text style={styles.freezerEndText}>[HASH: 0xDEADBEEF]</Text>
            </View>
          </ScrollView>
        </View>

        <View style={styles.encryptionContainer}>
          <EncryptionProgress progress={encryptionProgress} label={t.onboarding.encryptionLabel} />
        </View>

        <Pressable
          style={[styles.terminalButton, !encryptionComplete && styles.terminalButtonDisabled]}
          onPress={onNext}
          disabled={!encryptionComplete}
        >
          <Text style={styles.terminalButtonText}>
            {encryptionComplete
              ? t.onboarding.acceptTermsEncrypted
              : t.onboarding.acceptTermsPending}
          </Text>
        </Pressable>

        <Text style={styles.wizardWarning}>{t.onboarding.warningPrivacy}</Text>
      </Animated.View>
    </ScrollView>
  );
}

interface DeploymentStepViewProps {
  fadeAnim: Animated.Value;
  wizardTopPadding: number;
  sharedWizardScrollProps: SharedWizardScrollProps;
  codename: string;
  isSubmitting: boolean;
  onDeploy: () => void;
}

export function DeploymentStepView({
  fadeAnim,
  wizardTopPadding,
  sharedWizardScrollProps,
  codename,
  isSubmitting,
  onDeploy,
}: DeploymentStepViewProps) {
  return (
    <ScrollView
      style={styles.deploymentScrollView}
      contentContainerStyle={[styles.deploymentScrollContent, { paddingTop: wizardTopPadding }]}
      {...sharedWizardScrollProps}
    >
      <Animated.View style={{ opacity: fadeAnim }}>
        <GlitchText style={styles.wizardHeader} glitchIntensity="medium">
          [{t.onboarding.systemInitHeader}]
        </GlitchText>

        <View style={styles.terminalCard}>
          <Text style={styles.deploymentTitle}>{t.onboarding.agentProfileTitle}</Text>
          <View style={styles.agentProfileRow}>
            <Text style={styles.agentProfileLabel}>{t.onboarding.codenameLabelDeploy}</Text>
            <Text style={styles.agentProfileValue}>{codename}</Text>
          </View>
          <View style={styles.agentProfileRow}>
            <Text style={styles.agentProfileLabel}>{t.onboarding.securityLevelLabel}</Text>
            <Text style={styles.agentProfileValue}>{t.onboarding.levelClassified}</Text>
          </View>
          <View style={styles.agentProfileRow}>
            <Text style={styles.agentProfileLabel}>{t.onboarding.statusLabel}</Text>
            <Text style={[styles.agentProfileValue, { color: '#00FF41' }]}>{t.onboarding.ready}</Text>
          </View>
        </View>

        <View style={styles.terminalCard}>
          <Text style={styles.deploymentTitle}>{t.onboarding.missionOverviewTitle}</Text>
          <Text style={styles.deploymentText}>{t.onboarding.missionDirective1}</Text>
          <Text style={styles.deploymentText}>{t.onboarding.missionDirective2}</Text>
          <Text style={[styles.deploymentText, { marginTop: 12, color: '#888888' }]}>
            {t.onboarding.standBy}
          </Text>
        </View>

        <Pressable
          style={[styles.terminalButton, isSubmitting && styles.terminalButtonDisabled]}
          onPress={onDeploy}
          disabled={isSubmitting}
        >
          <Text style={styles.terminalButtonText}>
            {isSubmitting ? t.onboarding.deployingAgent : t.onboarding.beginMission}
          </Text>
        </Pressable>

        <Text style={styles.wizardWarning}>{t.onboarding.agentStandingBy(codename)}</Text>
      </Animated.View>
    </ScrollView>
  );
}

