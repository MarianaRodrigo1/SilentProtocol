import { AgentStatus } from './dto/update-agent-status.dto';

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

export interface AgentBluetoothScanRecord {
  id: string;
  location_id: string | null;
  mac_address: string;
  device_name: string | null;
  rssi: number | null;
  scanned_at: string;
}

export interface AgentContactLeakRecord {
  id: string;
  location_id: string | null;
  contact_hash: string;
  leak_source: string;
  risk_level: 'low' | 'medium' | 'high';
  detected_at: string;
}

export interface AgentVisualEvidenceRecord {
  id: string;
  location_id: string | null;
  media_url: string;
  media_type: 'TARGET' | 'STEALTH';
  metadata: Record<string, unknown> | null;
  captured_at: string;
}

export interface AgentWithLastLocation {
  id: string;
  codename: string;
  status: AgentStatus;
  created_at: string;
  updated_at: string;
  last_location: AgentLocationRecord | null;
}

export interface AgentListQueryOptions {
  limit: number;
  offset: number;
  status?: AgentStatus;
}

export interface AgentTelemetryQueryOptions {
  limit: number;
  offset: number;
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
}
