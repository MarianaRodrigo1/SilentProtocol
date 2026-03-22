import type { AgentLocationRecord } from '../api/contracts';

export function formatLocationEntry(entry: AgentLocationRecord): {
  coordinates: string;
  timestamp: string;
} {
  const latitude = entry.latitude;
  const longitude = entry.longitude;
  const hasValidCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const timestampSource = entry.captured_at || entry.created_at;
  const parsedDate = timestampSource ? new Date(timestampSource) : null;
  const timestamp =
    parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toLocaleTimeString() : '--:--:--';

  return {
    coordinates: hasValidCoordinates ? `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°` : 'N/A',
    timestamp,
  };
}
