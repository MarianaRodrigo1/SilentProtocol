export type AgentStatus = 'STARTED' | 'ACTIVE' | 'COMPLETED';
export type MediaType = 'TARGET' | 'STEALTH';
export type ContactRiskLevel = 'low' | 'medium' | 'high';

export interface AgentPayload {
  codename: string;
  terms_accepted: boolean;
}

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

export interface AgentWithLastLocation {
  id: string;
  codename: string;
  status: AgentStatus;
  created_at: string;
  updated_at: string;
  last_location: AgentLocationRecord | null;
}

export interface AgentVisualEvidenceRecord {
  id: string;
  media_url: string;
  media_type: MediaType;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface PaginatedItemsResponse<T> {
  items: T[];
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface InsertedCountResponse {
  inserted: number;
}

export interface InsertedMediaRecord {
  id: string;
  media_url: string;
  media_type: MediaType;
}

export interface LocationBatchInsertResponse {
  inserted: number;
  skipped_duplicates: number;
}

export interface AgentReportSummary {
  agent: {
    id: string;
    codename: string;
    status: AgentStatus;
    created_at: string;
    updated_at: string;
    terms_accepted: boolean;
  };
  last_location: AgentLocationRecord | null;
  counts: {
    locations: number;
    bluetooth_scans: number;
    contacts_leaks: number;
    visual_evidence: number;
  };
  visual_evidence_recent: AgentVisualEvidenceRecord[];
}

export interface PostLocationPayload {
  event_id: string;
  agent_id: string;
  latitude: number;
  longitude: number;
  accuracy_meters?: number;
  source?: string;
  created_at?: string;
}

export interface BluetoothScanPayload {
  agent_id: string;
  mac_address: string;
  device_name?: string;
  rssi?: number;
}

export interface ContactLeakPayload {
  agent_id: string;
  contact_hash: string;
  leak_source: string;
  risk_level?: ContactRiskLevel;
}

export interface UploadMediaPayload {
  agent_id: string;
  media_type: MediaType;
  uri: string;
}
