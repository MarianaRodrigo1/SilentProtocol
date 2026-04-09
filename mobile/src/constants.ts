export const API_DEV_DEFAULT_PORT = 3000;

export const HTTP_DEFAULT_REQUEST_TIMEOUT_MS = 12000;

export const CONNECTIVITY_BACKEND_PROBE_TIMEOUT_MS = 8000;
export const CONNECTIVITY_BACKEND_PROBE_INTERVAL_MS = 25_000;

export const AsyncStorageKeys = {
  gameSession: 'silent_protocol_game_session_v1',
  locationOutbox: 'silent_protocol_location_outbox_v1',
  contactsOutbox: 'silent_protocol_contacts_outbox_v1',
  bluetoothOutbox: 'silent_protocol_bluetooth_outbox_v1',
  mediaOutbox: 'silent_protocol_media_outbox_v1',
  localTelemetryMirror: 'silent_protocol_local_telemetry_v1',
  telemetrySession: 'silent_protocol_telemetry_session_v1',
  telemetrySessionLegacyAgent: 'silent_protocol_tracking_agent_id',
  telemetrySessionLegacySync: 'silent_protocol_tracking_sync_enabled',
  gpsTelemetryFailureAt: 'silent_protocol_tracking_last_background_error_at',
} as const;

export const MAX_MEDIA_OUTBOX_ITEMS = 100;

export const TELEMETRY_OUTBOX_FLUSH_CHUNK_SIZE = 25;

export const MAX_LOCATION_OUTBOX_ITEMS = 200;
export const MAX_CONTACTS_OUTBOX_ITEMS = 600;
export const MAX_BLUETOOTH_OUTBOX_ITEMS = 600;

export const LOCAL_TELEMETRY_MIRROR_MAX_LOCATIONS = 500;

export const LOCATION_UPDATE_INTERVAL_MS = 15000;
export const BACKGROUND_DISTANCE_INTERVAL_METERS = 10;
export const LOCATION_TELEMETRY_DEDUPE_WINDOW_MS = LOCATION_UPDATE_INTERVAL_MS;
export const LOCATION_OUTBOX_FLUSH_BATCH_SIZE = 20;

export const GPS_DEDUPE_MIN_DISTANCE_M = 8;
export const GPS_DEDUPE_MAX_DISTANCE_M = 100;

export const GPS_BACKGROUND_OUTBOX_FLUSH_MAX_CHAIN = 12;

export const GPS_FIRST_SYNC_RETRY_ATTEMPTS = 12;
export const GPS_FIRST_SYNC_RETRY_DELAY_MS = 500;
export const GPS_FIRST_SYNC_GRACE_EXTEND_MS = 6000;
export const GPS_LOCATION_CAPTURE_INITIAL_GRACE_MS = 12_000;

export const GPS_WEB_GEOLOCATION_TIMEOUT_MS = 35_000;
export const GPS_WEB_GEOLOCATION_MAXIMUM_AGE_MS = 120_000;
export const GPS_LAST_KNOWN_RECENT_MAX_AGE_MS = 120_000;
export const GPS_GET_CURRENT_TIMEOUT_MS = 35_000;
export const GPS_LAST_KNOWN_FALLBACK_MAX_AGE_MS = 900_000;
export const GPS_LAST_KNOWN_LOOSE_MAX_AGE_MS = 600_000;
export const GPS_LAST_KNOWN_LOOSE_REQUIRED_ACCURACY_M = 50_000;

export const LOCATION_START_SYNC_IN_FLIGHT_RETRIES = 32;
export const LOCATION_START_SYNC_IN_FLIGHT_DELAY_MS = 150;

export const BACKGROUND_LOCATION_TASK_NAME = 'silent-protocol-background-location';

export const CONTACTS_SYNC_INTERVAL_MS = 60000;
export const BLUETOOTH_SCAN_WINDOW_MS = 4000;
export const MAX_CONTACTS_PER_SYNC = 12;
export const MAX_BLUETOOTH_DEVICES_PER_SYNC = 10;

export const MISSION_DECRYPT_WINDOW_MS = 1800;
export const MISSION_COMPLETE_NAV_DELAY_MS = 2000;

export const MISSION_MAX_STEALTH_LEVEL = 100;

export const AGENT_STATUS_SYNC_MAX_ATTEMPTS = 3;
export const AGENT_STATUS_SYNC_BACKOFF_BASE_MS = 600;

export const FRONT_CAPTURE_STABILIZE_MS = 40;
export const REAR_CAPTURE_PREP_MS = 80;
export const REAR_CAPTURE_RETRY_MS = 120;
export const BACK_CAMERA_READY_DELAY_MS = 120;

export const SPLASH_MIN_DISPLAY_MS = 2200;

export const ONBOARDING_BOOT_TICK_MS = 200;
export const ONBOARDING_BOOT_TO_IDENTITY_DELAY_MS = 800;
export const ONBOARDING_FREEZER_TICK_MS = 100;

export const DEBRIEF_REVEAL_MS_1 = 800;
export const DEBRIEF_REVEAL_MS_2 = 1800;
export const DEBRIEF_REVEAL_MS_3 = 2800;
