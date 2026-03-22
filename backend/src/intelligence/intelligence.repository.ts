import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.constants';
import { CreateContactDto } from './dto/create-contact.dto';
import { CreateLocationDto } from './dto/create-location.dto';
import { CreateMediaDto } from './dto/create-media.dto';
import { CreateScanDto } from './dto/create-scan.dto';
import {
  InsertedCountResponse,
  InsertedLocationRow,
  InsertedMediaRecord,
} from './intelligence.types';

@Injectable()
export class IntelligenceRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async countOwnedLocationsByAgent(
    refs: Array<{ agent_id: string; location_id: string }>,
  ): Promise<number> {
    if (refs.length === 0) return 0;

    const { values, placeholders } = this.buildBatchInsert(refs, 2, (ref) => [
      ref.agent_id,
      ref.location_id,
    ]);
    const result = await this.pool.query<{ count: string }>(
      `WITH input(agent_id, location_id) AS (
         VALUES ${placeholders}
       )
       SELECT COUNT(*)::text AS count
       FROM input
       INNER JOIN locations l
         ON l.id = input.location_id::uuid
        AND l.agent_id = input.agent_id::uuid`,
      values,
    );
    return Number(result.rows[0]?.count ?? 0);
  }

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
    const { values, placeholders } = this.buildBatchInsert(scans, 5, (s) => [
      s.agent_id,
      s.location_id ?? null,
      s.mac_address,
      s.device_name ?? null,
      s.rssi ?? null,
    ]);

    await this.pool.query(
      `INSERT INTO bluetooth_scans (agent_id, location_id, mac_address, device_name, rssi) VALUES ${placeholders}`,
      values,
    );
    return { inserted: scans.length };
  }

  async insertContacts(contacts: CreateContactDto[]): Promise<InsertedCountResponse> {
    const { values, placeholders } = this.buildBatchInsert(contacts, 5, (c) => [
      c.agent_id,
      c.location_id ?? null,
      c.contact_hash,
      c.leak_source,
      c.risk_level ?? 'medium',
    ]);

    await this.pool.query(
      `INSERT INTO contacts_leaks (agent_id, location_id, contact_hash, leak_source, risk_level) VALUES ${placeholders}`,
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
      location.captured_at ?? null,
      location.event_id ?? null,
    ]);

    const result = await this.pool.query<InsertedLocationRow>(
      `WITH payload(agent_id, latitude, longitude, accuracy_meters, source, captured_at, event_id) AS (
         VALUES ${placeholders}
       )
       INSERT INTO locations (agent_id, latitude, longitude, accuracy_meters, source, captured_at, event_id)
       SELECT
         agent_id::uuid,
         latitude::numeric,
         longitude::numeric,
         accuracy_meters::numeric,
         source::varchar(50),
         COALESCE(captured_at::timestamptz, NOW()),
         COALESCE(event_id::uuid, gen_random_uuid())
       FROM payload
       ON CONFLICT (agent_id, event_id) DO NOTHING
       RETURNING id, agent_id, captured_at, created_at`,
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
      `INSERT INTO visual_evidence (agent_id, location_id, media_url, media_type, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING id, media_url, media_type`,
      [
        payload.agent_id,
        payload.location_id ?? null,
        mediaPath,
        payload.media_type,
        JSON.stringify(metadata),
      ],
    );
    return result.rows[0];
  }
}
