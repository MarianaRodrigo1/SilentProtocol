import { apiMessages, requestJson, requestJsonBody, requestVoidBody } from './http';
import type {
  AgentLocationRecord,
  AgentPayload,
  AgentRecord,
  AgentReportSummary,
  AgentStatus,
  AgentVisualEvidenceRecord,
  PaginatedItemsResponse,
} from './contracts';

export type {
  AgentLocationRecord,
  AgentPayload,
  AgentRecord,
  AgentReportSummary,
  AgentStatus,
  AgentVisualEvidenceRecord,
  PaginatedItemsResponse,
};

function toQueryString(options: { limit?: number; offset?: number } = {}): string {
  const query = new URLSearchParams();
  if (typeof options.limit === 'number') query.set('limit', String(options.limit));
  if (typeof options.offset === 'number') query.set('offset', String(options.offset));
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export async function createAgent(payload: AgentPayload): Promise<AgentRecord> {
  return requestJsonBody<AgentRecord>('/agents', 'POST', payload, apiMessages.createAgent);
}

export async function getAgentSummary(agentId: string): Promise<AgentReportSummary> {
  return requestJson<AgentReportSummary>(
    `/agents/${agentId}/summary`,
    { method: 'GET' },
    apiMessages.loadAgentSummary,
  );
}

export async function getAgentLocations(
  agentId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<PaginatedItemsResponse<AgentLocationRecord>> {
  return requestJson<PaginatedItemsResponse<AgentLocationRecord>>(
    `/agents/${agentId}/locations${toQueryString(options)}`,
    { method: 'GET' },
    apiMessages.loadAgentLocations,
  );
}

export async function getAgentVisualEvidence(
  agentId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<PaginatedItemsResponse<AgentVisualEvidenceRecord>> {
  return requestJson<PaginatedItemsResponse<AgentVisualEvidenceRecord>>(
    `/agents/${agentId}/visual-evidence${toQueryString(options)}`,
    { method: 'GET' },
    apiMessages.loadAgentVisualEvidence,
  );
}

export async function updateAgentStatus(agentId: string, status: AgentStatus): Promise<void> {
  await requestVoidBody(
    `/agents/${agentId}/status`,
    'PATCH',
    { status },
    apiMessages.updateAgentStatus,
  );
}
