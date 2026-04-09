import { apiMessages, requestJson, requestJsonBody, withQuery } from './http';
import type {
  AgentLocationRecord,
  AgentPayload,
  AgentRecord,
  AgentReportSummary,
  AgentStatus,
  AgentWithLastLocation,
  PaginatedItemsResponse,
} from './contracts';

export type ListAgentsOptions = {
  limit?: number;
  offset?: number;
  status?: AgentStatus;
};

export async function listAgents(
  options: ListAgentsOptions = {},
): Promise<PaginatedItemsResponse<AgentWithLastLocation>> {
  return requestJson<PaginatedItemsResponse<AgentWithLastLocation>>(
    withQuery('/agents', { limit: options.limit, offset: options.offset, status: options.status }),
    { method: 'GET' },
    apiMessages.loadAgents,
  );
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
    withQuery(`/agents/${agentId}/locations`, { limit: options.limit, offset: options.offset }),
    { method: 'GET' },
    apiMessages.loadAgentLocations,
  );
}

export async function updateAgentStatus(agentId: string, status: AgentStatus): Promise<AgentRecord> {
  return requestJsonBody<AgentRecord>(
    `/agents/${agentId}/status`,
    'PATCH',
    { status },
    apiMessages.updateAgentStatus,
  );
}
