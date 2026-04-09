import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/pg-pool.provider';
import type {
  AgentLocationRecord,
  AgentRecord,
  AgentReportSummary,
  AgentStatus,
  AgentVisualEvidenceRecord,
  AgentWithLastLocation,
} from '../common/types/agents';
import { CreateContactDto } from './dto/create-contact.dto';
import { CreateLocationDto } from './dto/create-location.dto';
import { CreateMediaDto } from './dto/create-media.dto';
import { CreateScanDto } from './dto/create-scan.dto';
import {
  InsertedCountResponse,
  InsertedLocationRow,
  InsertedMediaRecord,
} from '../common/types/telemetry';

function buildLocationJsonProjection(alias: string): string {
  return `json_build_object(
            'id', ${alias}.id,
            'latitude', ${alias}.latitude::float8,
            'longitude', ${alias}.longitude::float8,
            'accuracy_meters', ${alias}.accuracy_meters::float8,
            'source', ${alias}.source,
            'created_at', ${alias}.created_at
          )`;
}

function lastKnownLocationLateralJoin(alias: string): string {
  return `LEFT JOIN LATERAL (
    SELECT loc.id, loc.latitude, loc.longitude, loc.accuracy_meters, loc.source, loc.created_at
    FROM locations loc
    WHERE loc.agent_id = a.id
    ORDER BY loc.created_at DESC, loc.id DESC
    LIMIT 1
  ) ${alias} ON true`;
}

@Injectable()
export class IntelligenceRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private buildBatchInsert<T>(
    items: T[],
    fieldsPerItem: number,
    toValues: (item: T) => Array<string | number | null | Date>,
  ): { values: Array<string | number | null | Date>; placeholders: string } {
    const values: Array<string | number | null | Date> = [];
    const placeholders = items
      .map((item, index) => {
        const base = index * fieldsPerItem;
        values.push(...toValues(item));
        return `(${Array.from({ length: fieldsPerItem }, (_, i) => `$${base + i + 1}`).join(', ')})`;
      })
      .join(', ');
    return { values, placeholders };
  }

  async insertScans(scans: CreateScanDto[]): Promise<InsertedCountResponse> {
    const { values, placeholders } = this.buildBatchInsert(scans, 4, (s) => [
      s.agent_id,
      s.mac_address,
      s.device_name ?? null,
      s.rssi ?? null,
    ]);

    await this.pool.query(
      `INSERT INTO bluetooth_scans (agent_id, mac_address, device_name, rssi) VALUES ${placeholders}`,
      values,
    );
    return { inserted: scans.length };
  }

  async insertContacts(contacts: CreateContactDto[]): Promise<InsertedCountResponse> {
    const { values, placeholders } = this.buildBatchInsert(contacts, 4, (c) => [
      c.agent_id,
      c.contact_hash,
      c.leak_source,
      c.risk_level ?? 'medium',
    ]);

    await this.pool.query(
      `INSERT INTO contacts_leaks (agent_id, contact_hash, leak_source, risk_level) VALUES ${placeholders}`,
      values,
    );
    return { inserted: contacts.length };
  }

  async insertLocationRows(locations: CreateLocationDto[]): Promise<InsertedLocationRow[]> {
    if (locations.length === 0) return [];

    const { values, placeholders } = this.buildBatchInsert(locations, 7, (location) => [
      location.agent_id,
      location.latitude,
      location.longitude,
      location.accuracy_meters ?? null,
      location.source ?? 'gps',
      location.created_at ?? null,
      location.event_id ?? null,
    ]);

    const result = await this.pool.query<InsertedLocationRow>(
      `WITH payload(agent_id, latitude, longitude, accuracy_meters, source, created_at, event_id) AS (
         VALUES ${placeholders}
       )
       INSERT INTO locations (agent_id, latitude, longitude, accuracy_meters, source, created_at, event_id)
       SELECT
         agent_id::uuid,
         latitude::numeric,
         longitude::numeric,
         accuracy_meters::numeric,
         source::varchar(50),
         COALESCE(created_at::timestamptz, NOW()),
         COALESCE(event_id::uuid, gen_random_uuid())
       FROM payload
       ON CONFLICT (agent_id, event_id) DO NOTHING
       RETURNING id, agent_id, created_at`,
      values,
    );
    return result.rows;
  }

  async insertMedia(
    payload: CreateMediaDto,
    mediaPath: string,
    metadata: Record<string, unknown>,
  ): Promise<InsertedMediaRecord> {
    const result = await this.pool.query<InsertedMediaRecord>(
      `INSERT INTO visual_evidence (agent_id, media_url, media_type, metadata)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING id, media_url, media_type`,
      [payload.agent_id, mediaPath, payload.media_type, JSON.stringify(metadata)],
    );
    return result.rows[0];
  }

  async findAllWithLastLocation(options: {
    limit: number;
    offset: number;
    status?: AgentStatus;
  }): Promise<AgentWithLastLocation[]> {
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
      ${lastKnownLocationLateralJoin('l')}
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
        visual_evidence_recent: AgentVisualEvidenceRecord[] | null;
        locations_count: string;
        bluetooth_scans_count: string;
        contacts_leaks_count: string;
        visual_evidence_count: string;
      }
    >(
      `SELECT
         a.id,
         a.codename,
         a.terms_accepted,
         a.status,
         a.created_at,
         a.updated_at,
         CASE
           WHEN l.id IS NOT NULL THEN ${buildLocationJsonProjection('l')}
           ELSE NULL
         END AS last_location,
         COALESCE(
           (
             SELECT json_agg(
               json_build_object(
                 'id', ve.id,
                 'media_url', ve.media_url,
                 'media_type', ve.media_type,
                 'metadata', ve.metadata,
                 'created_at', ve.created_at
               )
               ORDER BY ve.created_at DESC, ve.id DESC
             )
             FROM (
               SELECT id, media_url, media_type, metadata, created_at
               FROM visual_evidence
               WHERE agent_id = a.id
               ORDER BY created_at DESC, id DESC
               LIMIT 50
             ) ve
           ),
           '[]'::json
         ) AS visual_evidence_recent,
         (SELECT COUNT(*)::text FROM locations WHERE agent_id = a.id) AS locations_count,
         (SELECT COUNT(*)::text FROM bluetooth_scans WHERE agent_id = a.id) AS bluetooth_scans_count,
         (SELECT COUNT(*)::text FROM contacts_leaks WHERE agent_id = a.id) AS contacts_leaks_count,
         (SELECT COUNT(*)::text FROM visual_evidence WHERE agent_id = a.id) AS visual_evidence_count
       FROM agents a
       ${lastKnownLocationLateralJoin('l')}
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
      visual_evidence_recent: row.visual_evidence_recent ?? [],
    };
  }

  async getLocationsPage(
    agentId: string,
    options: { limit: number; offset: number },
  ): Promise<AgentLocationRecord[]> {
    const result = await this.pool.query<AgentLocationRecord>(
      `SELECT
         id,
         latitude::float8 AS latitude,
         longitude::float8 AS longitude,
         accuracy_meters::float8 AS accuracy_meters,
         source,
         created_at
       FROM locations
       WHERE agent_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT $2
       OFFSET $3`,
      [agentId, options.limit, options.offset],
    );
    return result.rows;
  }
}
