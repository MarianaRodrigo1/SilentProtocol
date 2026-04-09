import { ActivityIndicator, Text, View } from 'react-native';
import { CrtScreenShell } from '../../components/layout/CrtScreenShell';
import { GlitchText } from '../../components/crt';
import { t } from '../../i18n';
import styles, { debriefingActivityIndicatorColor } from '../../styles/debriefing';

export function DebriefingLoadingView() {
  return (
    <CrtScreenShell>
      <View style={styles.loadingContainer}>
        <GlitchText style={styles.loadingText} glitchIntensity="high">
          {t.debrief.loadingDecrypting}
        </GlitchText>
        <ActivityIndicator size="large" color={debriefingActivityIndicatorColor} />
        <Text style={styles.loadingSubtext}>{t.debrief.loadingSubtext}</Text>
      </View>
    </CrtScreenShell>
  );
}

interface DebriefingRevealViewProps {
  revealStage: 0 | 1 | 2 | 3;
}

export function DebriefingRevealView({ revealStage }: DebriefingRevealViewProps) {
  return (
    <CrtScreenShell>
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
    </CrtScreenShell>
  );
}
