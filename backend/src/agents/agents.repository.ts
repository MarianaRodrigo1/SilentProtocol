import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import type { QueryResultRow } from 'pg';
import { PG_POOL } from '../database/database.constants';
import { CreateAgentDto } from './dto/create-agent.dto';
import { AgentStatus } from './dto/update-agent-status.dto';
import {
  AgentBluetoothScanRecord,
  AgentContactLeakRecord,
  AgentListQueryOptions,
  AgentLocationRecord,
  AgentRecord,
  AgentReportSummary,
  AgentTelemetryQueryOptions,
  AgentVisualEvidenceRecord,
  AgentWithLastLocation,
} from './agents.types';

function buildLocationJsonProjection(alias: string): string {
  return `json_build_object(
            'id', ${alias}.id,
            'latitude', ${alias}.latitude::float8,
            'longitude', ${alias}.longitude::float8,
            'accuracy_meters', ${alias}.accuracy_meters::float8,
            'source', ${alias}.source,
            'captured_at', ${alias}.captured_at,
            'created_at', ${alias}.created_at
          )`;
}

@Injectable()
export class AgentsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private async fetchTelemetryPage<T extends QueryResultRow>(
    query: string,
    agentId: string,
    options: AgentTelemetryQueryOptions,
  ): Promise<T[]> {
    const result = await this.pool.query<T>(query, [agentId, options.limit, options.offset]);
    return result.rows;
  }

  async create(agent: CreateAgentDto): Promise<AgentRecord> {
    const query = `
      INSERT INTO agents (codename, biometric_confirmed, terms_accepted)
      VALUES ($1, $2, $3)
      RETURNING id, codename, biometric_confirmed, terms_accepted, status, created_at, updated_at;
    `;

    const values = [agent.codename, agent.biometric_confirmed, agent.terms_accepted];

    const result = await this.pool.query<AgentRecord>(query, values);
    return result.rows[0];
  }

  async updateStatus(agentId: string, status: AgentStatus): Promise<AgentRecord | null> {
    const query = `
      UPDATE agents
      SET status = $2
      WHERE id = $1
      RETURNING id, codename, biometric_confirmed, terms_accepted, status, created_at, updated_at;
    `;
    const result = await this.pool.query<AgentRecord>(query, [agentId, status]);
    return result.rows[0] ?? null;
  }

  async existsById(agentId: string): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM agents WHERE id = $1) AS exists',
      [agentId],
    );
    return Boolean(result.rows[0]?.exists);
  }

  async countByIds(agentIds: string[]): Promise<number> {
    if (agentIds.length === 0) return 0;

    const result = await this.pool.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM agents WHERE id = ANY($1::uuid[])',
      [agentIds],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async findAllWithLastLocation(options: AgentListQueryOptions): Promise<AgentWithLastLocation[]> {
    const statusFilterSql = options.status ? 'WHERE a.status = $3' : '';
    const values = options.status
      ? [options.limit, options.offset, options.status]
      : [options.limit, options.offset];
    const query = `
      SELECT
        a.id,
        a.codename,
        a.status,
        a.created_at,
        a.updated_at,
        CASE
          WHEN l.id IS NOT NULL THEN ${buildLocationJsonProjection('l')}
          ELSE NULL
        END AS last_location
      FROM agents a
      LEFT JOIN locations l ON l.id = a.last_location_id
      ${statusFilterSql}
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT $1
      OFFSET $2
    `;
    const result = await this.pool.query<AgentWithLastLocation>(query, values);
    return result.rows;
  }

  async getAgentReportSummary(agentId: string): Promise<AgentReportSummary | null> {
    const result = await this.pool.query<
      AgentRecord & {
        last_location: AgentLocationRecord | null;
        locations_count: string;
        bluetooth_scans_count: string;
        contacts_leaks_count: string;
        visual_evidence_count: string;
      }
    >(
      `SELECT
         a.id,
         a.codename,
         a.biometric_confirmed,
         a.terms_accepted,
         a.status,
         a.created_at,
         a.updated_at,
         CASE
           WHEN l.id IS NOT NULL THEN ${buildLocationJsonProjection('l')}
           ELSE NULL
         END AS last_location,
         (SELECT COUNT(*)::text FROM locations WHERE agent_id = a.id) AS locations_count,
         (SELECT COUNT(*)::text FROM bluetooth_scans WHERE agent_id = a.id) AS bluetooth_scans_count,
         (SELECT COUNT(*)::text FROM contacts_leaks WHERE agent_id = a.id) AS contacts_leaks_count,
         (SELECT COUNT(*)::text FROM visual_evidence WHERE agent_id = a.id) AS visual_evidence_count
       FROM agents a
       LEFT JOIN locations l ON l.id = a.last_location_id
       WHERE a.id = $1
       LIMIT 1`,
      [agentId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      agent: {
        id: row.id,
        codename: row.codename,
        biometric_confirmed: row.biometric_confirmed,
        terms_accepted: row.terms_accepted,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
      last_location: row.last_location,
      counts: {
        locations: Number(row.locations_count),
        bluetooth_scans: Number(row.bluetooth_scans_count),
        contacts_leaks: Number(row.contacts_leaks_count),
        visual_evidence: Number(row.visual_evidence_count),
      },
    };
  }

  async getLocationsPage(
    agentId: string,
    options: AgentTelemetryQueryOptions,
  ): Promise<AgentLocationRecord[]> {
    return this.fetchTelemetryPage<AgentLocationRecord>(
      `SELECT
         id,
         latitude::float8 AS latitude,
         longitude::float8 AS longitude,
         accuracy_meters::float8 AS accuracy_meters,
         source,
         captured_at,
         created_at
       FROM locations
       WHERE agent_id = $1
       ORDER BY captured_at DESC, created_at DESC, id DESC
       LIMIT $2
       OFFSET $3`,
      agentId,
      options,
    );
  }

  async getBluetoothScansPage(
    agentId: string,
    options: AgentTelemetryQueryOptions,
  ): Promise<AgentBluetoothScanRecord[]> {
    return this.fetchTelemetryPage<AgentBluetoothScanRecord>(
      `SELECT
         id,
         location_id,
         mac_address,
         device_name,
         rssi,
         scanned_at
       FROM bluetooth_scans
       WHERE agent_id = $1
       ORDER BY scanned_at DESC, id DESC
       LIMIT $2
       OFFSET $3`,
      agentId,
      options,
    );
  }

  async getContactsLeaksPage(
    agentId: string,
    options: AgentTelemetryQueryOptions,
  ): Promise<AgentContactLeakRecord[]> {
    return this.fetchTelemetryPage<AgentContactLeakRecord>(
      `SELECT
         id,
         location_id,
         contact_hash,
         leak_source,
         risk_level,
         detected_at
       FROM contacts_leaks
       WHERE agent_id = $1
       ORDER BY detected_at DESC, id DESC
       LIMIT $2
       OFFSET $3`,
      agentId,
      options,
    );
  }

  async getVisualEvidencePage(
    agentId: string,
    options: AgentTelemetryQueryOptions,
  ): Promise<AgentVisualEvidenceRecord[]> {
    return this.fetchTelemetryPage<AgentVisualEvidenceRecord>(
      `SELECT
         id,
         location_id,
         media_url,
         media_type,
         metadata,
         captured_at
       FROM visual_evidence
       WHERE agent_id = $1
       ORDER BY captured_at DESC, id DESC
       LIMIT $2
       OFFSET $3`,
      agentId,
      options,
    );
  }
}
