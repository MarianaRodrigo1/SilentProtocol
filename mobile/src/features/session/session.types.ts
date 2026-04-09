export interface LocalEvidence {
  targetPhotoUri: string | null;
  stealthPhotoUri: string | null;
}

export type AgentConnectivityMode = 'online' | 'offline';

export interface AgentSession {
  id: string;
  codename: string;
  mode: AgentConnectivityMode;
}

export interface GameSessionSnapshot {
  agent: AgentSession | null;
  missionDone: boolean;
  localEvidence: LocalEvidence;
}
