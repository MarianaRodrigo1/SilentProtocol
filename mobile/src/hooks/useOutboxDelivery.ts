import { useCallback, useRef } from 'react';
import { getApiErrorInfo } from '../api';

interface UseOutboxDeliveryOptions<TPayload> {
  enabled: boolean;
  enqueue: (payload: TPayload) => Promise<boolean>;
  enqueueMany?: (payloads: TPayload[]) => Promise<void>;
  flush: () => Promise<void>;
}

export type FlushOutcome = 'flushed' | 'in_flight' | 'failed' | 'failed_retryable' | 'disabled';

interface OutboxDeliveryApi<TPayload> {
  enqueueOne: (payload: TPayload) => Promise<boolean>;
  enqueueMany: (payloads: TPayload[]) => Promise<void>;
  flushSafely: () => Promise<FlushOutcome>;
  enqueueManyAndFlushSafely: (payloads: TPayload[]) => Promise<FlushOutcome>;
}

export function useOutboxDelivery<TPayload>({
  enabled,
  enqueue,
  enqueueMany: enqueueManyRaw,
  flush,
}: UseOutboxDeliveryOptions<TPayload>): OutboxDeliveryApi<TPayload> {
  const flushInFlightRef = useRef(false);
  const pendingFlushRef = useRef(false);

  const enqueueOne = useCallback(
    async (payload: TPayload): Promise<boolean> => {
      return enqueue(payload);
    },
    [enqueue],
  );

  const enqueueMany = useCallback(
    async (payloads: TPayload[]): Promise<void> => {
      if (payloads.length === 0) return;
      if (enqueueManyRaw) {
        await enqueueManyRaw(payloads);
        return;
      }
      for (const payload of payloads) {
        await enqueue(payload);
      }
    },
    [enqueue, enqueueManyRaw],
  );

  const flushSafely = useCallback(async (): Promise<FlushOutcome> => {
    if (!enabled) return 'disabled';
    if (flushInFlightRef.current) {
      pendingFlushRef.current = true;
      return 'in_flight';
    }

    flushInFlightRef.current = true;
    let lastOutcome: FlushOutcome = 'flushed';
    try {
      for (;;) {
        pendingFlushRef.current = false;
        try {
          await flush();
          lastOutcome = 'flushed';
        } catch (error: unknown) {
          lastOutcome = getApiErrorInfo(error).retryable ? 'failed_retryable' : 'failed';
        }
        if (!pendingFlushRef.current) {
          return lastOutcome;
        }
      }
    } finally {
      flushInFlightRef.current = false;
    }
  }, [enabled, flush]);

  const enqueueManyAndFlushSafely = useCallback(
    async (payloads: TPayload[]): Promise<FlushOutcome> => {
      if (!enabled) return 'disabled';
      await enqueueMany(payloads);
      return flushSafely();
    },
    [enabled, enqueueMany, flushSafely],
  );

  return {
    enqueueOne,
    enqueueMany,
    flushSafely,
    enqueueManyAndFlushSafely,
  };
}
