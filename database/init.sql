CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude NUMERIC(10, 8) NOT NULL,
  longitude NUMERIC(11, 8) NOT NULL,
  accuracy_meters NUMERIC(8, 2),
  source VARCHAR(50) NOT NULL DEFAULT 'gps',
  event_id UUID NOT NULL DEFAULT gen_random_uuid(),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codename VARCHAR(80) NOT NULL,
  biometric_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'locations' AND column_name = 'agent_id'
  ) THEN
    ALTER TABLE locations ADD COLUMN agent_id UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'locations' AND column_name = 'captured_at'
  ) THEN
    ALTER TABLE locations ADD COLUMN captured_at TIMESTAMPTZ;
    UPDATE locations SET captured_at = created_at WHERE captured_at IS NULL;
    ALTER TABLE locations ALTER COLUMN captured_at SET NOT NULL;
    ALTER TABLE locations ALTER COLUMN captured_at SET DEFAULT NOW();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'locations' AND column_name = 'event_id'
  ) THEN
    ALTER TABLE locations ADD COLUMN event_id UUID;
  END IF;
  UPDATE locations SET event_id = gen_random_uuid() WHERE event_id IS NULL;
  ALTER TABLE locations ALTER COLUMN event_id SET NOT NULL;
  ALTER TABLE locations ALTER COLUMN event_id SET DEFAULT gen_random_uuid();

  DELETE FROM locations WHERE agent_id IS NULL;

  ALTER TABLE locations
    ALTER COLUMN agent_id SET NOT NULL;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_locations_agent_id'
  ) THEN
    ALTER TABLE locations
      ADD CONSTRAINT fk_locations_agent_id
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_locations_agent_event_id'
  ) THEN
    ALTER TABLE locations
      ADD CONSTRAINT uq_locations_agent_event_id UNIQUE (agent_id, event_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS bluetooth_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  mac_address VARCHAR(17) NOT NULL,
  device_name VARCHAR(120),
  rssi SMALLINT,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contacts_leaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  contact_hash VARCHAR(255) NOT NULL,
  leak_source VARCHAR(120) NOT NULL,
  risk_level VARCHAR(20) NOT NULL DEFAULT 'medium',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visual_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  media_url TEXT NOT NULL,
  media_type VARCHAR(20) NOT NULL,
  metadata JSONB,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  ALTER TABLE agents
    ALTER COLUMN status SET DEFAULT 'ACTIVE';

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'last_location_id'
  ) THEN
    ALTER TABLE agents ADD COLUMN last_location_id UUID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_agents_last_location_id') THEN
    ALTER TABLE agents
      ADD CONSTRAINT fk_agents_last_location_id
      FOREIGN KEY (last_location_id) REFERENCES locations(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_locations_latitude_range') THEN
    ALTER TABLE locations
      ADD CONSTRAINT chk_locations_latitude_range CHECK (latitude BETWEEN -90 AND 90);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_locations_longitude_range') THEN
    ALTER TABLE locations
      ADD CONSTRAINT chk_locations_longitude_range CHECK (longitude BETWEEN -180 AND 180);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_locations_accuracy_positive') THEN
    ALTER TABLE locations
      ADD CONSTRAINT chk_locations_accuracy_positive CHECK (accuracy_meters IS NULL OR accuracy_meters >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_bluetooth_mac_format') THEN
    ALTER TABLE bluetooth_scans
      ADD CONSTRAINT chk_bluetooth_mac_format CHECK (mac_address ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_contacts_risk_level') THEN
    ALTER TABLE contacts_leaks
      ADD CONSTRAINT chk_contacts_risk_level CHECK (risk_level IN ('low', 'medium', 'high'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_media_type') THEN
    ALTER TABLE visual_evidence
      ADD CONSTRAINT chk_media_type CHECK (media_type IN ('TARGET', 'STEALTH'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_agents_status_not_blank') THEN
    ALTER TABLE agents
      ADD CONSTRAINT chk_agents_status_not_blank CHECK (char_length(trim(status)) > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_agents_status_allowed') THEN
    ALTER TABLE agents
      ADD CONSTRAINT chk_agents_status_allowed
      CHECK (status IN ('ACTIVE', 'MISSION_ACTIVE', 'MISSION_COMPLETE'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION set_agents_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_agents_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_agents_set_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION set_agents_updated_at();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION set_agent_last_location_from_locations_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  cur_last_id uuid;
  cur_cap timestamptz;
  cur_created timestamptz;
BEGIN
  SELECT a.last_location_id, l.captured_at, l.created_at
  INTO cur_last_id, cur_cap, cur_created
  FROM agents a
  LEFT JOIN locations l ON l.id = a.last_location_id
  WHERE a.id = NEW.agent_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF cur_last_id IS NULL OR cur_cap IS NULL THEN
    UPDATE agents SET last_location_id = NEW.id WHERE id = NEW.agent_id;
    RETURN NEW;
  END IF;

  IF cur_cap < NEW.captured_at
     OR (cur_cap = NEW.captured_at AND cur_created <= NEW.created_at)
  THEN
    UPDATE agents SET last_location_id = NEW.id WHERE id = NEW.agent_id;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_locations_set_agent_last_location'
  ) THEN
    CREATE TRIGGER trg_locations_set_agent_last_location
      AFTER INSERT ON locations
      FOR EACH ROW
      EXECUTE FUNCTION set_agent_last_location_from_locations_insert();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_locations_agent_created_at ON locations(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_locations_agent_captured_at ON locations(agent_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_agents_last_location_id ON agents(last_location_id);
CREATE INDEX IF NOT EXISTS idx_bluetooth_agent_scanned_at ON bluetooth_scans(agent_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_agent_detected_at ON contacts_leaks(agent_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_visual_agent_captured_at ON visual_evidence(agent_id, captured_at DESC);
