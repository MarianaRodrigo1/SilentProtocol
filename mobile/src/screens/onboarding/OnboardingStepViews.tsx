import type { ReactNode } from 'react';
import { Animated, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { CrtScreenShell } from '../../components/layout/CrtScreenShell';
import { EncryptionProgress, GlitchText, TerminalCursor } from '../../components/crt';
import { t } from '../../i18n';
import styles from '../../styles/onboarding';
import { palette } from '../../styles/theme';

const WIZARD_SCROLL_PROPS = {
  showsVerticalScrollIndicator: true,
  keyboardShouldPersistTaps: 'handled' as const,
  keyboardDismissMode: 'on-drag' as const,
};

interface BaseScreenProps {
  children: ReactNode;
}

export function OnboardingBaseScreen({ children }: BaseScreenProps) {
  return <CrtScreenShell>{children}</CrtScreenShell>;
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
  codename: string;
  onCodenameChange: (value: string) => void;
  onNext: () => void;
}

export function IdentityStepView({
  fadeAnim,
  wizardTopPadding,
  codename,
  onCodenameChange,
  onNext,
}: IdentityStepViewProps) {
  return (
    <ScrollView
      style={styles.wizardScrollView}
      contentContainerStyle={[styles.wizardScrollContent, { paddingTop: wizardTopPadding }]}
      {...WIZARD_SCROLL_PROPS}
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
              placeholderTextColor={palette.inputPlaceholder}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
              style={styles.terminalInput}
            />
            <TerminalCursor visible={codename.length > 0} />
          </View>
          <Text style={styles.terminalHint}>[{t.onboarding.codenameHint}]</Text>
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
  encryptionProgress: number;
  encryptionComplete: boolean;
  onNext: () => void;
}

export function FreezerStepView({
  fadeAnim,
  wizardTopPadding,
  encryptionProgress,
  encryptionComplete,
  onNext,
}: FreezerStepViewProps) {
  return (
    <ScrollView
      style={styles.wizardScrollView}
      contentContainerStyle={[styles.wizardScrollContent, { paddingTop: wizardTopPadding }]}
      {...WIZARD_SCROLL_PROPS}
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
            {encryptionComplete ? t.onboarding.acceptTermsEncrypted : t.onboarding.acceptTermsPending}
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
  codename: string;
  isSubmitting: boolean;
  onDeploy: () => void;
}

export function DeploymentStepView({
  fadeAnim,
  wizardTopPadding,
  codename,
  isSubmitting,
  onDeploy,
}: DeploymentStepViewProps) {
  return (
    <ScrollView
      style={styles.deploymentScrollView}
      contentContainerStyle={[styles.deploymentScrollContent, { paddingTop: wizardTopPadding }]}
      {...WIZARD_SCROLL_PROPS}
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
            <Text style={styles.agentProfileValue}>{t.onboarding.ready}</Text>
          </View>
        </View>

        <View style={styles.terminalCard}>
          <Text style={styles.deploymentTitle}>{t.onboarding.missionOverviewTitle}</Text>
          <Text style={styles.deploymentText}>{t.onboarding.missionDirective1}</Text>
          <Text style={styles.deploymentText}>{t.onboarding.missionDirective2}</Text>
          <Text style={styles.deploymentStandBy}>{t.onboarding.standBy}</Text>
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
