import { type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { SplashScreen } from './components/SplashScreen';
import { DebriefingScreen } from './screens/DebriefingScreen';
import { MissionScreen } from './screens/MissionScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { useGameSession } from './features/session/useGameSession';

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
          onMissionComplete={completeMission}
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
