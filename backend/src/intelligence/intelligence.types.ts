export interface InsertedMediaRecord {
  id: string;
  media_url: string;
  media_type: 'TARGET' | 'STEALTH';
}

export interface InsertedCountResponse {
  inserted: number;
}

export interface LocationBatchInsertResponse {
  inserted: number;
  skipped_duplicates: number;
}

export interface InsertedLocationRow {
  id: string;
  agent_id: string;
  captured_at: Date;
  created_at: Date;
}
