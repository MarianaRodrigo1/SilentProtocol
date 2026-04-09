import * as Contacts from 'expo-contacts';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { postContactLeaks } from '../api';
import {
  enqueueContactsOutbox,
  enqueueContactsOutboxMany,
  flushContactsOutboxInBatches,
} from '../services/contactsOutbox';
import { hashText } from '../utils/identifiers';
import { CONTACTS_SYNC_INTERVAL_MS, MAX_CONTACTS_PER_SYNC } from '../constants';
import type { ContactsSyncResult } from '../types/missionRuntime';
import { useOutboxDelivery } from './useOutboxDelivery';
import {
  deliverTelemetryBatch,
  deliveryFailedTelemetryResult,
  ensureTelemetryPermissionGranted,
  flushTelemetryOutboxToSyncResult,
} from './telemetryDelivery';
import { addContactsLeakCount } from '../storage/localTelemetryMirror';

function buildContactEntries(contacts: Contacts.Contact[]): { contact_hash: string; leak_source: string }[] {
  return contacts.slice(0, MAX_CONTACTS_PER_SYNC).map((contact) => {
    const primaryNumber = contact.phoneNumbers?.[0]?.number ?? '';
    const raw = `${contact.id ?? ''}|${contact.name ?? ''}|${primaryNumber}`;
    return {
      contact_hash: hashText(raw),
      leak_source: 'trust_network_setup',
    };
  });
}

function buildSnapshotDigest(entries: { contact_hash: string }[]): string {
  return entries
    .map((entry) => entry.contact_hash)
    .sort()
    .join('|');
}

export function useContactsSync(agentId: string, syncToServer = true) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncInFlightRef = useRef(false);
  const lastDeliveredDigestRef = useRef<string | null>(null);
  const lastQueuedDigestRef = useRef<string | null>(null);

  const { flushSafely: flushOutboxSafely, enqueueManyAndFlushSafely } = useOutboxDelivery({
    enabled: syncToServer,
    enqueue: enqueueContactsOutbox,
    enqueueMany: enqueueContactsOutboxMany,
    flush: () => flushContactsOutboxInBatches(postContactLeaks),
  });

  const syncContactsSnapshot = useCallback(
    async (options: { requestPermission?: boolean } = {}): Promise<ContactsSyncResult> => {
      const shouldRequest = options.requestPermission !== false;
      try {
        const permissionStatus = await Contacts.getPermissionsAsync();
        const permission =
          permissionStatus.status === 'granted'
            ? permissionStatus
            : shouldRequest
              ? await Contacts.requestPermissionsAsync()
              : permissionStatus;

        if (permission.status !== 'granted') {
          const permissionResult = ensureTelemetryPermissionGranted(
            permission.canAskAgain === false ? 'blocked' : 'denied',
          );
          if (permissionResult) {
            return permissionResult;
          }
        }

        const data = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
          pageSize: 50,
        });
        const entries = buildContactEntries(data.data);
        const payloads = entries.map((entry) => ({
          agent_id: agentId,
          contact_hash: entry.contact_hash,
          leak_source: entry.leak_source,
          risk_level: 'medium' as const,
        }));

        const snapshotDigest = buildSnapshotDigest(entries);
        if (
          lastDeliveredDigestRef.current === snapshotDigest ||
          lastQueuedDigestRef.current === snapshotDigest
        ) {
          if (syncToServer) {
            return flushTelemetryOutboxToSyncResult(flushOutboxSafely);
          }
          return deliverTelemetryBatch({
            payloads: [],
            syncToServer,
            enqueueManyAndFlushSafely,
            flushOutboxSafely,
          });
        }

        const result = await deliverTelemetryBatch({
          payloads,
          syncToServer,
          enqueueManyAndFlushSafely,
          flushOutboxSafely,
          onAcceptedLocally: !syncToServer
            ? async () => {
                await addContactsLeakCount(agentId, payloads.length);
              }
            : undefined,
        });
        if (!result.ok) return result;
        const delivery = result.value.delivery;
        if (delivery === 'uploaded_now') {
          lastDeliveredDigestRef.current = snapshotDigest;
          lastQueuedDigestRef.current = null;
        } else if (delivery === 'queued_for_retry') {
          lastQueuedDigestRef.current = snapshotDigest;
        }
        return result;
      } catch {
        return deliveryFailedTelemetryResult();
      }
    },
    [agentId, enqueueManyAndFlushSafely, flushOutboxSafely, syncToServer],
  );

  const startContactsSync = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      if (AppState.currentState !== 'active') return;
      if (syncInFlightRef.current) return;
      syncInFlightRef.current = true;
      void syncContactsSnapshot({ requestPermission: false }).finally(() => {
        syncInFlightRef.current = false;
      });
    }, CONTACTS_SYNC_INTERVAL_MS);
  }, [syncContactsSnapshot]);

  const stopContactsSync = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    syncInFlightRef.current = false;
  }, []);

  const flushPendingContacts = useCallback(async () => {
    await flushOutboxSafely();
  }, [flushOutboxSafely]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      syncInFlightRef.current = false;
    };
  }, []);

  return { syncContactsSnapshot, startContactsSync, stopContactsSync, flushPendingContacts };
}
