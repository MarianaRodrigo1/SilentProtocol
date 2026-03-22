import { API_BASE_URL } from './config';

type ApiErrorCode = 'NETWORK_ERROR' | 'TIMEOUT' | 'HTTP_ERROR';
type ApiErrorKind = 'network_unreachable' | 'timeout' | 'http_client' | 'http_server' | 'unknown';

const DEFAULT_REQUEST_TIMEOUT_MS = 12000;
const JSON_HEADERS: HeadersInit = { 'Content-Type': 'application/json' };

export class ApiError extends Error {
  code: ApiErrorCode;
  status?: number;

  constructor(message: string, code: ApiErrorCode, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

interface ApiErrorInfo {
  kind: ApiErrorKind;
  retryable: boolean;
  serverUnreachable: boolean;
  status?: number;
  message?: string;
}

interface ApiErrorPayload {
  message?: string | string[];
}

function buildApiFetchHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  if (API_BASE_URL.includes('ngrok')) {
    headers.set('ngrok-skip-browser-warning', '1');
  }
  return headers;
}

async function parseApiError(response: Response, fallback: string): Promise<never> {
  let message = fallback;
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    if (Array.isArray(payload.message)) {
      message = payload.message.join(' ');
    } else if (typeof payload.message === 'string') {
      message = payload.message;
    }
  } catch {}
  throw new ApiError(message, 'HTTP_ERROR', response.status);
}

function mergeAbortSignals(a: AbortSignal, b: AbortSignal): { signal: AbortSignal; dispose: () => void } {
  const c = new AbortController();
  const onAbort = () => {
    a.removeEventListener('abort', onAbort);
    b.removeEventListener('abort', onAbort);
    if (!c.signal.aborted) {
      c.abort();
    }
  };
  if (a.aborted || b.aborted) {
    if (!c.signal.aborted) c.abort();
    return { signal: c.signal, dispose: () => {} };
  }
  a.addEventListener('abort', onAbort);
  b.addEventListener('abort', onAbort);
  return {
    signal: c.signal,
    dispose: () => {
      a.removeEventListener('abort', onAbort);
      b.removeEventListener('abort', onAbort);
    },
  };
}

function abortSignalWithTimeout(
  timeoutMs: number,
  userSignal: AbortSignal | undefined,
): { signal: AbortSignal; dispose: () => void } {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
  const clearTimer = () => clearTimeout(timeoutId);

  if (!userSignal) {
    return { signal: timeoutController.signal, dispose: clearTimer };
  }

  const anyFn = typeof AbortSignal !== 'undefined' && (AbortSignal as { any?: (s: AbortSignal[]) => AbortSignal }).any;
  if (typeof anyFn === 'function') {
    return {
      signal: anyFn([timeoutController.signal, userSignal]),
      dispose: clearTimer,
    };
  }

  const merged = mergeAbortSignals(timeoutController.signal, userSignal);
  return {
    signal: merged.signal,
    dispose: () => {
      merged.dispose();
      clearTimer();
    },
  };
}

async function request(
  endpoint: string,
  init: RequestInit,
  fallbackMessage: string,
): Promise<Response> {
  const headers = buildApiFetchHeaders(init.headers);
  const userAbort = init.signal ?? undefined;
  const { signal, dispose } = abortSignalWithTimeout(DEFAULT_REQUEST_TIMEOUT_MS, userAbort);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...init,
      headers,
      signal,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      if (userAbort?.aborted) {
        throw new ApiError('Request aborted.', 'NETWORK_ERROR');
      }
      throw new ApiError('Request timed out.', 'TIMEOUT');
    }
    throw new ApiError(fallbackMessage, 'NETWORK_ERROR');
  } finally {
    dispose();
  }
  if (!response.ok) {
    return parseApiError(response, fallbackMessage);
  }
  return response;
}

export async function probeBackendReachable(timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE_URL}/agents?limit=1`, {
      method: 'GET',
      headers: buildApiFetchHeaders(),
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function jsonRequestInit(method: 'POST' | 'PATCH' | 'PUT', payload: unknown): RequestInit {
  return {
    method,
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  };
}

export async function requestJson<T>(
  endpoint: string,
  init: RequestInit,
  fallbackMessage: string,
): Promise<T> {
  const response = await request(endpoint, init, fallbackMessage);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function requestVoid(
  endpoint: string,
  init: RequestInit,
  fallbackMessage: string,
): Promise<void> {
  await request(endpoint, init, fallbackMessage);
}

export async function requestJsonBody<T>(
  endpoint: string,
  method: 'POST' | 'PATCH' | 'PUT',
  payload: unknown,
  fallbackMessage: string,
): Promise<T> {
  return requestJson<T>(endpoint, jsonRequestInit(method, payload), fallbackMessage);
}

export async function requestVoidBody(
  endpoint: string,
  method: 'POST' | 'PATCH' | 'PUT',
  payload: unknown,
  fallbackMessage: string,
): Promise<void> {
  await requestVoid(endpoint, jsonRequestInit(method, payload), fallbackMessage);
}

export function isRetryableApiError(error: unknown): boolean {
  return getApiErrorInfo(error).retryable;
}

function looksLikeNetworkFailureMessage(message: string): boolean {
  return /network request failed|failed to fetch|load failed|internet connection|offline|unreachable|refused|timeout|timed out|ENOTFOUND|ECONNREFUSED|ECONNRESET|certificate|ssl|cleartext|cleartext not permitted|unable to resolve|no address associated|host lookup failed|network is unreachable|connection reset|software caused connection abort|socketexception|unknown host/i.test(
    message,
  );
}

export function getApiErrorInfo(error: unknown): ApiErrorInfo {
  if (!(error instanceof ApiError)) {
    const message = error instanceof Error ? error.message : String(error ?? '');
    const looksNetwork = looksLikeNetworkFailureMessage(message);
    return {
      kind: looksNetwork ? 'network_unreachable' : 'unknown',
      retryable: looksNetwork,
      serverUnreachable: looksNetwork,
      message: message || undefined,
    };
  }

  if (error.code === 'TIMEOUT') {
    return {
      kind: 'timeout',
      retryable: true,
      serverUnreachable: true,
      message: error.message,
      status: error.status,
    };
  }

  if (error.code === 'NETWORK_ERROR') {
    return {
      kind: 'network_unreachable',
      retryable: true,
      serverUnreachable: true,
      message: error.message,
      status: error.status,
    };
  }

  if (error.code === 'HTTP_ERROR') {
    const status = error.status;
    const isServerError = Boolean(status && status >= 500);
    return {
      kind: isServerError ? 'http_server' : 'http_client',
      retryable: isServerError,
      serverUnreachable: isServerError,
      message: error.message,
      status: error.status,
    };
  }

  return {
    kind: 'unknown',
    retryable: false,
    serverUnreachable: false,
    message: error.message,
    status: error.status,
  };
}

export const apiMessages = {
  createAgent: 'Could not create agent profile.',
  updateAgentStatus: 'Could not update agent mission status.',
  loadAgentSummary: 'Could not load mission summary.',
  loadAgentLocations: 'Could not load mission location history.',
  loadAgentVisualEvidence: 'Could not load mission visual evidence.',
  postLocation: 'Could not transmit location data.',
  postBluetooth: 'Could not transmit Bluetooth scan data.',
  postContacts: 'Could not transmit contacts telemetry.',
  uploadMedia: 'Could not upload mission evidence.',
} as const;
