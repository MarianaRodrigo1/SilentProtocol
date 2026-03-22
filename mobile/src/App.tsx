import { Component, type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Button, Text, View } from 'react-native';
import { SplashScreen } from './components/SplashScreen';
import { DebriefingScreen } from './screens/DebriefingScreen';
import { MissionScreen } from './screens/MissionScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { useGameSession } from './features/session/useGameSession';
import type { LocalEvidence } from './types/evidence';
import { clearGameSession } from './storage/gameSession';
import { runBestEffort } from './utils/async';

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; restartKey: number }
> {
  state = { hasError: false, restartKey: 0 };

  static getDerivedStateFromError = () => ({ hasError: true });

  handleRestart = async () => {
    await runBestEffort(() => clearGameSession());
    this.setState((prev) => ({ hasError: false, restartKey: prev.restartKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#0a0a0a' }}>
          <Text style={{ color: '#fff', marginBottom: 16, textAlign: 'center' }}>Something went wrong.</Text>
          <Button title="Restart app" onPress={this.handleRestart} />
        </View>
      );
    }
    return <View key={this.state.restartKey} style={{ flex: 1 }}>{this.props.children}</View>;
  }
}

export default function App() {
  const { isHydrating, agent, missionDone, localEvidence, setAgent, completeMission, restartAdventure } =
    useGameSession();

  const renderContent = (): ReactNode => {
    if (isHydrating) return null;

    if (!agent) {
      return (
        <OnboardingScreen
          onAgentReady={(id, codename, mode) => {
            setAgent({ id, codename, mode });
          }}
        />
      );
    }

    if (!missionDone) {
      return (
        <MissionScreen
          agentId={agent.id}
          codename={agent.codename}
          agentMode={agent.mode}
          onMissionComplete={(payload) => {
            const evidence: LocalEvidence = {
              targetPhotoUri: payload.targetPhotoUri,
              stealthPhotoUri: payload.stealthPhotoUri,
            };
            completeMission(evidence);
          }}
        />
      );
    }

    return (
      <DebriefingScreen
        agentId={agent.id}
        codename={agent.codename}
        agentMode={agent.mode}
        localEvidence={localEvidence}
        onRestartAdventure={restartAdventure}
      />
    );
  };

  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <SplashScreen isReady={!isHydrating}>
          {renderContent()}
        </SplashScreen>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}
