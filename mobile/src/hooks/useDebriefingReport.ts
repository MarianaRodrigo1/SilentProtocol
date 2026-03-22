import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type AgentLocationRecord,
  type AgentReportSummary,
  type AgentVisualEvidenceRecord,
  getAgentLocations,
  getAgentSummary,
  getAgentVisualEvidence,
} from '../api/agents';
import { resolveApiMediaUrl } from '../api/resolveMediaUrl';
import { t } from '../i18n';
import type { LocalEvidence } from '../types/evidence';
import { getTelemetryMirror, type AgentTelemetryMirror } from '../storage/localTelemetryMirror';
import { getBackgroundTrackingErrorTimestamp } from '../location/backgroundLocationTask';

export type DebriefReportSource = 'server' | 'local_mirror' | 'local_fallback';

interface UseDebriefingReportOptions {
  agentId: string;
  codename: string;
  agentMode: 'online' | 'offline';
  localEvidence: LocalEvidence;
}

function buildSummaryFromMirror(
  agentId: string,
  codename: string,
  mirror: AgentTelemetryMirror | null,
  localEvidence: LocalEvidence,
): AgentReportSummary {
  const m = mirror ?? { locations: [], contactsLeaks: 0, bluetoothScans: 0 };
  const visual =
    (localEvidence.targetPhotoUri ? 1 : 0) + (localEvidence.stealthPhotoUri ? 1 : 0);
  const nowIso = new Date().toISOString();
  const locs = m.locations;
  const tail = locs.length > 0 ? locs[locs.length - 1]! : null;
  const last: AgentLocationRecord | null = tail
    ? {
        id: tail.id,
        latitude: tail.latitude,
        longitude: tail.longitude,
        accuracy_meters: tail.accuracy_meters,
        source: tail.source,
        captured_at: tail.captured_at,
        created_at: tail.created_at,
      }
    : null;

  return {
    agent: {
      id: agentId,
      codename,
      status: 'MISSION_COMPLETE',
      created_at: nowIso,
      updated_at: nowIso,
      biometric_confirmed: true,
      terms_accepted: true,
    },
    last_location: last,
    counts: {
      locations: locs.length,
      bluetooth_scans: m.bluetoothScans,
      contacts_leaks: m.contactsLeaks,
      visual_evidence: visual,
    },
  };
}

export function useDebriefingReport({
  agentId,
  codename,
  agentMode,
  localEvidence,
}: UseDebriefingReportOptions) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AgentReportSummary | null>(null);
  const [locations, setLocations] = useState<AgentLocationRecord[]>([]);
  const [visualEvidence, setVisualEvidence] = useState<AgentVisualEvidenceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reportSource, setReportSource] = useState<DebriefReportSource>('server');
  const [revealStage, setRevealStage] = useState<0 | 1 | 2 | 3>(0);
  const [showDetails, setShowDetails] = useState(false);
  const [backgroundTrackingIssueAt, setBackgroundTrackingIssueAt] = useState<number | null>(null);
  const mountedRef = useRef(true);
  const lastLoadRequestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadReport = useCallback(async () => {
    const requestId = lastLoadRequestIdRef.current + 1;
    lastLoadRequestIdRef.current = requestId;
    const isCurrentRequest = () => mountedRef.current && lastLoadRequestIdRef.current === requestId;

    if (isCurrentRequest()) {
      setLoading(true);
      setError(null);
    }
    const backgroundIssueAt = await getBackgroundTrackingErrorTimestamp();
    if (isCurrentRequest()) {
      setBackgroundTrackingIssueAt(backgroundIssueAt);
    }

    if (agentMode === 'offline') {
      try {
        const mirror = await getTelemetryMirror(agentId);
        if (!isCurrentRequest()) return;
        setSummary(buildSummaryFromMirror(agentId, codename, mirror, localEvidence));
        setLocations(mirror?.locations ?? []);
        setVisualEvidence([]);
        setReportSource('local_fallback');
      } finally {
        if (isCurrentRequest()) setLoading(false);
      }
      return;
    }

    try {
      const [summaryPayload, locationsPayload, visualEvidencePayload] = await Promise.all([
        getAgentSummary(agentId),
        getAgentLocations(agentId, { limit: 60, offset: 0 }),
        getAgentVisualEvidence(agentId, { limit: 50, offset: 0 }),
      ]);
      if (!isCurrentRequest()) return;
      setSummary(summaryPayload);
      setLocations(locationsPayload.items);
      setVisualEvidence(visualEvidencePayload.items);
      setReportSource('server');
      setError(null);
    } catch (_err: unknown) {
      if (!isCurrentRequest()) return;
      const mirror = await getTelemetryMirror(agentId);
      if (!isCurrentRequest()) return;
      setSummary(buildSummaryFromMirror(agentId, codename, mirror, localEvidence));
      setLocations(mirror?.locations ?? []);
      setVisualEvidence([]);
      setReportSource('local_mirror');
      setError(t.debrief.loadError);
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  }, [agentId, agentMode, codename, localEvidence]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setRevealStage(1), 800),
      setTimeout(() => setRevealStage(2), 1800),
      setTimeout(() => setRevealStage(3), 2800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const exposureScore = useMemo(() => {
    if (!summary) return 0;
    const raw =
      summary.counts.locations * 12 +
      summary.counts.bluetooth_scans * 8 +
      summary.counts.contacts_leaks * 10 +
      summary.counts.visual_evidence * 15;
    return Math.min(100, raw);
  }, [summary]);

  const threatLevel = useMemo(() => {
    if (exposureScore >= 75) return { level: t.debrief.threatLevelCritical, color: '#FF3131' };
    if (exposureScore >= 50) return { level: t.debrief.threatLevelHigh, color: '#FF8C00' };
    if (exposureScore >= 25) return { level: t.debrief.threatLevelModerate, color: '#FFD700' };
    return { level: t.debrief.threatLevelLow, color: '#00FF41' };
  }, [exposureScore]);

  const targetEvidence = visualEvidence.find((media) => media.media_type === 'TARGET');
  const stealthEvidence = visualEvidence.find((media) => media.media_type === 'STEALTH');
  const hasReport = Boolean(summary);

  const targetImageUri = resolveApiMediaUrl(targetEvidence?.media_url ?? localEvidence.targetPhotoUri ?? null);
  const stealthImageUri = resolveApiMediaUrl(stealthEvidence?.media_url ?? localEvidence.stealthPhotoUri ?? null);

  return {
    loading,
    summary,
    locations,
    error,
    reportSource,
    revealStage,
    showDetails,
    backgroundTrackingIssueAt,
    hasReport,
    exposureScore,
    threatLevel,
    targetImageUri,
    stealthImageUri,
    setShowDetails,
    loadReport,
  };
}
