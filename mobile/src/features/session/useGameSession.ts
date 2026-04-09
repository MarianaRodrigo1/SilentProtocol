import { useCallback, useEffect, useState } from 'react';
import { clearGameSession, loadGameSession, saveGameSession } from '../../storage/gameSession';
import type { AgentSession, LocalEvidence } from './session.types';
import { fireAndForget, runBestEffort } from '../../utils/promiseUtils';

interface UseGameSessionState {
  isHydrating: boolean;
  agent: AgentSession | null;
  missionDone: boolean;
  localEvidence: LocalEvidence;
}

const INITIAL_STATE: UseGameSessionState = {
  isHydrating: true,
  agent: null,
  missionDone: false,
  localEvidence: {
    targetPhotoUri: null,
    stealthPhotoUri: null,
  },
};

async function clearSessionSafely(): Promise<void> {
  await runBestEffort(() => clearGameSession());
}

export function useGameSession() {
  const [state, setState] = useState<UseGameSessionState>(INITIAL_STATE);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const session = await loadGameSession();
        if (cancelled) return;

        if (!session) {
          setState((prev) => ({ ...prev, isHydrating: false }));
          return;
        }

        setState({
          isHydrating: false,
          agent: session.agent,
          missionDone: session.missionDone,
          localEvidence: session.localEvidence,
        });
      } catch {
        await clearSessionSafely();
        if (!cancelled) {
          setState((prev) => ({ ...prev, isHydrating: false }));
        }
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state.isHydrating) return;
    fireAndForget(
      saveGameSession({
        agent: state.agent,
        missionDone: state.missionDone,
        localEvidence: state.localEvidence,
      }),
    );
  }, [state.agent, state.isHydrating, state.localEvidence, state.missionDone]);

  const setAgent = useCallback((agent: AgentSession | null) => {
    setState((prev) => ({ ...prev, agent }));
  }, []);

  const completeMission = useCallback((evidence: LocalEvidence) => {
    setState((prev) => ({ ...prev, missionDone: true, localEvidence: evidence }));
  }, []);

  const restartAdventure = useCallback(() => {
    setState({
      isHydrating: false,
      agent: null,
      missionDone: false,
      localEvidence: { ...INITIAL_STATE.localEvidence },
    });
    void clearSessionSafely();
  }, []);

  return {
    ...state,
    setAgent,
    completeMission,
    restartAdventure,
  };
}
