export type AgentStatus = 'ACTIVE' | 'MISSION_ACTIVE' | 'MISSION_COMPLETE';
export type MediaType = 'TARGET' | 'STEALTH';
export type ContactRiskLevel = 'low' | 'medium' | 'high';

export interface AgentPayload {
  codename: string;
  biometric_confirmed: boolean;
  terms_accepted: boolean;
}

export interface AgentRecord {
  id: string;
  codename: string;
  biometric_confirmed: boolean;
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
  captured_at: string;
  created_at: string;
}

export interface AgentVisualEvidenceRecord {
  id: string;
  location_id: string | null;
  media_url: string;
  media_type: MediaType;
  metadata: Record<string, unknown> | null;
  captured_at: string;
}

export interface PaginatedItemsResponse<T> {
  items: T[];
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface AgentReportSummary {
  agent: {
    id: string;
    codename: string;
    status: AgentStatus;
    created_at: string;
    updated_at: string;
    biometric_confirmed: boolean;
    terms_accepted: boolean;
  };
  last_location: AgentLocationRecord | null;
  counts: {
    locations: number;
    bluetooth_scans: number;
    contacts_leaks: number;
    visual_evidence: number;
  };
}

export interface PostLocationPayload {
  event_id: string;
  agent_id: string;
  latitude: number;
  longitude: number;
  accuracy_meters?: number;
  source?: string;
  captured_at?: string;
}

export interface BluetoothScanPayload {
  agent_id: string;
  location_id?: string;
  mac_address: string;
  device_name?: string;
  rssi?: number;
}

export interface ContactLeakPayload {
  agent_id: string;
  location_id?: string;
  contact_hash: string;
  leak_source: string;
  risk_level?: ContactRiskLevel;
}

export interface UploadMediaPayload {
  agent_id: string;
  media_type: MediaType;
  uri: string;
}
