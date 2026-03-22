import type { LocalEvidence } from '../../types/evidence';

export interface AgentSession {
  id: string;
  codename: string;
  mode: 'online' | 'offline';
}

export interface GameSessionSnapshot {
  agent: AgentSession | null;
  missionDone: boolean;
  localEvidence: LocalEvidence;
}
