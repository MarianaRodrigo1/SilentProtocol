import AsyncStorage from '@react-native-async-storage/async-storage';
import { createKeyedSerialExclusiveRunner } from '../utils/storageSerialQueue';

interface CreatePersistentOutboxOptions<T> {
  storageKey: string;
  maxItems: number;
  isSame: (a: T, b: T) => boolean;
}

interface OutboxEntry<T> {
  id: string;
  payload: T;
}

const runExclusiveByStorageKey = createKeyedSerialExclusiveRunner();

function createPersistentOutbox<T>({
  storageKey,
  maxItems,
  isSame,
}: CreatePersistentOutboxOptions<T>) {
  let flushBatchesInFlight = false;
  let pendingBatchFlush = false;
  let flushOneByOneInFlight = false;
  let pendingOneByOneFlush = false;

  const createEntryId = (): string =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  const isStoredEntry = (value: unknown): value is OutboxEntry<T> =>
    Boolean(
      value &&
        typeof value === 'object' &&
        'id' in value &&
        typeof (value as { id?: unknown }).id === 'string' &&
        'payload' in value,
    );

  const createEntry = (payload: T): OutboxEntry<T> => ({
    id: createEntryId(),
    payload,
  });

  const readEntries = async (): Promise<OutboxEntry<T>[]> => {
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];

      const entries = parsed.map((item) =>
        isStoredEntry(item) ? item : createEntry(item as T),
      );
      const hadLegacyFormat = parsed.some((item) => !isStoredEntry(item));
      if (hadLegacyFormat) {
        await writeEntries(entries);
      }
      return entries;
    } catch (_error: unknown) {
      return [];
    }
  };

  const writeEntries = async (items: OutboxEntry<T>[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(items.slice(-maxItems)));
    } catch (_error: unknown) {}
  };

  const withLock = async <R>(operation: () => Promise<R>): Promise<R> => {
    return runExclusiveByStorageKey(storageKey, operation);
  };

  const enqueue = async (payload: T): Promise<boolean> => {
    return withLock(async () => {
      const current = await readEntries();
      if (current.some((entry) => isSame(entry.payload, payload))) {
        return false;
      }
      current.push(createEntry(payload));
      await writeEntries(current);
      return true;
    });
  };

  const enqueueMany = async (payloads: T[]): Promise<void> => {
    if (payloads.length === 0) return;

    await withLock(async () => {
      const current = await readEntries();
      let changed = false;

      for (const payload of payloads) {
        if (current.some((entry) => isSame(entry.payload, payload))) continue;
        current.push(createEntry(payload));
        changed = true;
      }

      if (changed) {
        await writeEntries(current);
      }
    });
  };

  const flushInBatches = async (
    sender: (payload: T[]) => Promise<void>,
    batchSize = 25,
  ): Promise<void> => {
    const normalizedBatchSize = Math.max(1, Math.trunc(batchSize));
    if (flushBatchesInFlight) {
      pendingBatchFlush = true;
      return;
    }

    const startsWithBatch = (
      items: OutboxEntry<T>[],
      batch: OutboxEntry<T>[],
    ): boolean => {
      if (items.length < batch.length) return false;
      for (let i = 0; i < batch.length; i += 1) {
        if (items[i]?.id !== batch[i]?.id) return false;
      }
      return true;
    };

    flushBatchesInFlight = true;
    try {
      for (;;) {
        pendingBatchFlush = false;
        for (;;) {
          const batch = await withLock(async (): Promise<OutboxEntry<T>[] | null> => {
            const current = await readEntries();
            if (current.length === 0) return null;
            const take = Math.min(current.length, normalizedBatchSize);
            return current.slice(0, take);
          });

          if (!batch || batch.length === 0) break;

          await sender(batch.map((entry) => entry.payload));

          await withLock(async () => {
            const current = await readEntries();
            if (startsWithBatch(current, batch)) {
              await writeEntries(current.slice(batch.length));
            }
          });
        }
        if (!pendingBatchFlush) return;
      }
    } finally {
      flushBatchesInFlight = false;
    }
  };

  const flushOneByOne = async (
    sender: (payload: T) => Promise<void>,
    shouldDiscard?: (error: unknown, payload: T) => boolean,
  ): Promise<void> => {
    if (flushOneByOneInFlight) {
      pendingOneByOneFlush = true;
      return;
    }

    flushOneByOneInFlight = true;
    try {
      for (;;) {
        pendingOneByOneFlush = false;
        for (;;) {
          const entry = await withLock(async (): Promise<OutboxEntry<T> | null> => {
            const current = await readEntries();
            if (current.length === 0) return null;
            return current[0] ?? null;
          });
          if (entry === null) break;

          try {
            await sender(entry.payload);
            await withLock(async () => {
              const current = await readEntries();
              const head = current[0];
              if (head && head.id === entry.id) {
                await writeEntries(current.slice(1));
              }
            });
          } catch (error: unknown) {
            if (shouldDiscard?.(error, entry.payload)) {
              await withLock(async () => {
                const current = await readEntries();
                const head = current[0];
                if (head && head.id === entry.id) {
                  await writeEntries(current.slice(1));
                }
              });
              continue;
            }
            return;
          }
        }
        if (!pendingOneByOneFlush) return;
      }
    } finally {
      flushOneByOneInFlight = false;
    }
  };

  return {
    enqueue,
    enqueueMany,
    flushInBatches,
    flushOneByOne,
  };
}

export function defineOutboxQueue<T>(options: CreatePersistentOutboxOptions<T>) {
  const o = createPersistentOutbox(options);
  return {
    enqueue: (payload: T) => o.enqueue(payload),
    enqueueMany: (payloads: T[]) => o.enqueueMany(payloads),
    flushInBatches: (sender: (batch: T[]) => Promise<void>, batchSize?: number) =>
      o.flushInBatches(sender, batchSize),
    flushOneByOne: (
      sender: (payload: T) => Promise<void>,
      shouldDiscard?: (error: unknown, payload: T) => boolean,
    ) => o.flushOneByOne(sender, shouldDiscard),
  };
}
