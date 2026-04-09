export const ALLOWED_AGENT_STATUSES = ['STARTED', 'ACTIVE', 'COMPLETED'] as const;
export type AgentStatus = (typeof ALLOWED_AGENT_STATUSES)[number];

export interface AgentRecord {
  id: string;
  codename: string;
  terms_accepted: boolean;
  status: AgentStatus;
  created_at: string;
  updated_at: string;
}

export interface AgentLocationRecord {
  id: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  source: string;
  created_at: string;
}

export interface AgentVisualEvidenceRecord {
  id: string;
  media_url: string;
  media_type: 'TARGET' | 'STEALTH';
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AgentWithLastLocation {
  id: string;
  codename: string;
  status: AgentStatus;
  created_at: string;
  updated_at: string;
  last_location: AgentLocationRecord | null;
}

export interface PaginatedItemsResponse<T> {
  items: T[];
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface AgentReportSummary {
  agent: AgentRecord;
  last_location: AgentLocationRecord | null;
  counts: {
    locations: number;
    bluetooth_scans: number;
    contacts_leaks: number;
    visual_evidence: number;
  };
  visual_evidence_recent: AgentVisualEvidenceRecord[];
}
