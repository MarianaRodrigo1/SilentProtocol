import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CRTScanlines, GlitchText } from '../../components/crt';
import { t } from '../../i18n';
import styles from '../../styles/debriefing';

export function DebriefingLoadingView() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <CRTScanlines />
        <View style={styles.loadingContainer}>
          <GlitchText style={styles.loadingText} glitchIntensity="high">
            {t.debrief.loadingDecrypting}
          </GlitchText>
          <ActivityIndicator size="large" color="#00FF41" />
          <Text style={styles.loadingSubtext}>{t.debrief.loadingSubtext}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

interface DebriefingRevealViewProps {
  revealStage: 0 | 1 | 2 | 3;
}

export function DebriefingRevealView({ revealStage }: DebriefingRevealViewProps) {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <CRTScanlines />
        <View style={styles.revealContainer}>
          {revealStage >= 1 && (
            <GlitchText style={styles.revealPrimary} glitchIntensity="high">
              {t.debrief.revealMissionAccomplished}
            </GlitchText>
          )}
          {revealStage >= 2 && (
            <GlitchText style={styles.revealSecondary} glitchIntensity="medium">
              {t.debrief.revealYouWereTarget}
            </GlitchText>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
