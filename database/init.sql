-- Silent Protocol — PostgreSQL schema (bootstrap only).
-- Model: `agents` is the identity hub. `locations` references `agents` via `agent_id`.
-- Telemetry (`bluetooth_scans`, `contacts_leaks`, `visual_evidence`) references only
-- `agent_id` — correlation with GPS is temporal (same agent, debrief lists), not a FK.
-- Last known position is derived with a lateral subquery in the API layer, not denormalized.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codename VARCHAR(80) NOT NULL,
  terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'STARTED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_agents_status_not_blank CHECK (char_length(trim(status)) > 0),
  CONSTRAINT chk_agents_status_allowed CHECK (
    status IN ('STARTED', 'ACTIVE', 'COMPLETED')
  )
);

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  latitude NUMERIC(10, 8) NOT NULL,
  longitude NUMERIC(11, 8) NOT NULL,
  accuracy_meters NUMERIC(8, 2),
  source VARCHAR(50) NOT NULL DEFAULT 'gps',
  event_id UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_locations_agent_id FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE CASCADE,
  CONSTRAINT uq_locations_agent_event_id UNIQUE (agent_id, event_id),
  CONSTRAINT chk_locations_latitude_range CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT chk_locations_longitude_range CHECK (longitude BETWEEN -180 AND 180),
  CONSTRAINT chk_locations_accuracy_positive CHECK (
    accuracy_meters IS NULL OR accuracy_meters >= 0
  )
);

CREATE TABLE bluetooth_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents (id) ON DELETE CASCADE,
  mac_address VARCHAR(17) NOT NULL,
  device_name VARCHAR(120),
  rssi SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_bluetooth_mac_format CHECK (
    mac_address ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
  )
);

CREATE TABLE contacts_leaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents (id) ON DELETE CASCADE,
  contact_hash VARCHAR(255) NOT NULL,
  leak_source VARCHAR(120) NOT NULL,
  risk_level VARCHAR(20) NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_contacts_risk_level CHECK (risk_level IN ('low', 'medium', 'high'))
);

CREATE TABLE visual_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents (id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type VARCHAR(20) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_media_type CHECK (media_type IN ('TARGET', 'STEALTH'))
);

CREATE OR REPLACE FUNCTION set_agents_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agents_set_updated_at ON agents;
CREATE TRIGGER trg_agents_set_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION set_agents_updated_at();

CREATE INDEX idx_locations_agent_created_at ON locations (agent_id, created_at DESC);
CREATE INDEX idx_bluetooth_agent_created_at ON bluetooth_scans (agent_id, created_at DESC);
CREATE INDEX idx_contacts_agent_created_at ON contacts_leaks (agent_id, created_at DESC);
CREATE INDEX idx_visual_agent_created_at ON visual_evidence (agent_id, created_at DESC);
