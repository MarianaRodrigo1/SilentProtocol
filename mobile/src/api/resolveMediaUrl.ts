import { API_BASE_URL } from './config';

export function resolveApiMediaUrl(uri: string | null | undefined): string | null {
  if (!uri || typeof uri !== 'string') return null;
  const trimmed = uri.trim();
  if (!trimmed) return null;
  if (/^(file:|content:)/.test(trimmed)) return trimmed;
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  const base = API_BASE_URL.replace(/\/+$/, '');
  return trimmed.startsWith('/') ? `${base}${trimmed}` : `${base}/${trimmed}`;
}
