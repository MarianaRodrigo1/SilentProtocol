import { Image } from 'expo-image';
import type { ImageStyle } from 'react-native';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CrtScreenShell } from '../components/layout/CrtScreenShell';
import { GlitchText } from '../components/crt';
import type { AgentConnectivityMode, LocalEvidence } from '../features/session/session.types';
import { useDebriefingReport } from '../hooks/useDebriefingReport';
import { useDeviceFingerprint } from '../hooks/useDeviceFingerprint';
import { t } from '../i18n';
import styles from '../styles/debriefing';
import { formatLocationEntry } from './debriefing/debriefingFormat';
import { DebriefingLoadingView, DebriefingRevealView } from './debriefing/DebriefingStatusViews';

interface DebriefingScreenProps {
  agentId: string;
  codename: string;
  agentMode: AgentConnectivityMode;
  localEvidence: LocalEvidence;
  onRestartAdventure: () => void;
}

export function DebriefingScreen({
  agentId,
  codename,
  agentMode,
  localEvidence,
  onRestartAdventure,
}: DebriefingScreenProps) {
  const insets = useSafeAreaInsets();
  const deviceFingerprint = useDeviceFingerprint();
  const {
    loading,
    summary,
    locations,
    error,
    reportSource,
    revealStage,
    showDetails,
    backgroundTrackingIssueAt,
    hasReport,
    exposureScore,
    threatLevel,
    targetImageUri,
    stealthImageUri,
    setShowDetails,
    loadReport,
  } = useDebriefingReport({
    agentId,
    codename,
    agentMode,
    localEvidence,
  });

  if (loading) {
    return <DebriefingLoadingView />;
  }

  if (revealStage < 3) {
    return <DebriefingRevealView revealStage={revealStage} />;
  }

  return (
    <CrtScreenShell>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(24, insets.top + 16), paddingBottom: insets.bottom + 24 },
        ]}
      >
        <GlitchText style={styles.title} glitchIntensity="high">
          {t.debrief.reportTitle}
        </GlitchText>
        <Text style={styles.subtitle}>{t.debrief.reportAgent(codename)}</Text>
        <Text style={styles.subtitle}>{t.debrief.reportClassification}</Text>
        {reportSource === 'local_fallback' ? (
          <Text style={styles.subtitleNoteSlate}>{t.debrief.reportLocalFallbackDescription}</Text>
        ) : null}
        {reportSource === 'local_mirror' ? (
          <Text style={styles.subtitleNoteWarning}>{t.debrief.localMirrorDescription}</Text>
        ) : null}
        {backgroundTrackingIssueAt ? (
          <Text style={styles.subtitleNoteWarning}>{t.debrief.backgroundTrackingIssue}</Text>
        ) : null}

        <View style={[styles.threatBanner, { borderColor: threatLevel.color }]}>
          <Text style={styles.threatLabel}>{t.debrief.threatLabel}</Text>
          <Text style={[styles.threatValue, { color: threatLevel.color }]}>{threatLevel.level}</Text>
          <Text style={styles.threatScore}>{exposureScore}/100</Text>
        </View>

        <View style={styles.warningCard}>
          <GlitchText style={styles.warningTitle} glitchIntensity="medium">
            {t.debrief.warningTitle}
          </GlitchText>
          <Text style={styles.warningText}>{t.debrief.warningText1}</Text>
          <Text style={styles.warningText}>{t.debrief.warningText2}</Text>
          <Text style={styles.warningTextCritical}>{t.debrief.warningText3}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.debrief.cardDataTransmitted}</Text>
          {hasReport && summary ? (
            <>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>{t.debrief.dataLabelGps}</Text>
                <Text style={styles.dataValue}>{t.debrief.dataValueLogs(summary.counts.locations)}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>{t.debrief.dataLabelBluetooth}</Text>
                <Text style={styles.dataValue}>
                  {t.debrief.dataValueDevices(summary.counts.bluetooth_scans)}
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>{t.debrief.dataLabelContacts}</Text>
                <Text style={styles.dataValue}>
                  {t.debrief.dataValueEntries(summary.counts.contacts_leaks)}
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>{t.debrief.dataLabelVisual}</Text>
                <Text style={styles.dataValue}>
                  {t.debrief.dataValuePhotos(summary.counts.visual_evidence)}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.dataValueSolo}>{t.debrief.loadErrorTitle}</Text>
          )}
          {reportSource === 'local_mirror' ? (
            <Pressable style={styles.toggleButtonRetry} onPress={() => void loadReport()}>
              <Text style={styles.toggleButtonText}>[RETRY REPORT FETCH]</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.debrief.cardFingerprint}</Text>
          <View style={styles.fingerprintGrid}>
            <View style={styles.fingerprintItem}>
              <Text style={styles.fingerprintLabel}>{t.debrief.fingerprintModel}</Text>
              <Text style={styles.fingerprintValue}>{deviceFingerprint.model}</Text>
            </View>
            <View style={styles.fingerprintItem}>
              <Text style={styles.fingerprintLabel}>{t.debrief.fingerprintBattery}</Text>
              <Text style={styles.fingerprintValue}>{deviceFingerprint.battery}</Text>
            </View>
            <View style={styles.fingerprintItem}>
              <Text style={styles.fingerprintLabel}>{t.debrief.fingerprintManufacturer}</Text>
              <Text style={styles.fingerprintValue}>{deviceFingerprint.manufacturer}</Text>
            </View>
            <View style={styles.fingerprintItem}>
              <Text style={styles.fingerprintLabel}>{t.debrief.fingerprintPlatform}</Text>
              <Text style={styles.fingerprintValue}>{Platform.OS}</Text>
            </View>
          </View>
        </View>

        {targetImageUri ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.debrief.cardVisualTarget}</Text>
            <Image
              source={{ uri: targetImageUri }}
              style={styles.evidenceImage as ImageStyle}
              contentFit="cover"
              accessibilityLabel={t.debrief.accessibilityTargetPhoto}
            />
            <Text style={styles.evidenceCaption}>{t.debrief.evidenceCaptionTarget}</Text>
          </View>
        ) : null}
        {stealthImageUri ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.debrief.cardVisualStealth}</Text>
            <Image
              source={{ uri: stealthImageUri }}
              style={styles.evidenceImage as ImageStyle}
              contentFit="cover"
              accessibilityLabel={t.debrief.accessibilityStealthPhoto}
            />
            <Text style={styles.evidenceCaption}>{t.debrief.evidenceCaptionStealth}</Text>
          </View>
        ) : null}

        <Pressable style={styles.toggleButton} onPress={() => setShowDetails((prev) => !prev)}>
          <Text style={styles.toggleButtonText}>
            {showDetails ? t.debrief.toggleHideTrail : t.debrief.toggleShowTrail}
          </Text>
        </Pressable>

        {showDetails && locations.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.debrief.cardLocationTrail}</Text>
            <ScrollView style={styles.logContainer} nestedScrollEnabled>
              {locations.slice(0, 5).map((loc) => {
                const formatted = formatLocationEntry(loc);
                return (
                  <View key={loc.id} style={styles.logEntry}>
                    <Text style={styles.logTimestamp}>[{formatted.timestamp}]</Text>
                    <Text style={styles.logData}>{formatted.coordinates}</Text>
                  </View>
                );
              })}
              {locations.length > 5 ? (
                <Text style={styles.logMore}>{t.debrief.logMore(locations.length - 5)}</Text>
              ) : null}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.finalCard}>
          <GlitchText style={styles.finalTitle} glitchIntensity="high">
            {t.debrief.finalTitle}
          </GlitchText>
          <Text style={styles.finalText}>{t.debrief.finalText1}</Text>
          <Text style={styles.finalTextCritical}>{t.debrief.finalText2}</Text>
        </View>

        <Pressable style={styles.restartButton} onPress={onRestartAdventure}>
          <Text style={styles.restartButtonText}>{t.debrief.restartSimulation}</Text>
        </Pressable>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>
    </CrtScreenShell>
  );
}
