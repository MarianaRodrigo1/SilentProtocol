import { LOCATION_UPDATE_INTERVAL_MS } from './locationTelemetryConfig';

function bytesToUuid(bytes: Uint8Array): string {
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function stableBytesFromKey(key: string): Uint8Array {
  const out = new Uint8Array(16);
  const enc = new TextEncoder().encode(key);
  let a = 0xdeadbeef;
  let b = 0x41c6ce57;
  let c = 0xcafebabe;
  let d = 0x0badf00d;
  for (let i = 0; i < enc.length; i += 1) {
    const x = enc[i]!;
    a = Math.imul(a ^ x, 0x9e3779b1);
    b = Math.imul(b ^ a, 0x85ebca6b);
    c ^= Math.imul(b, x + i);
    d += Math.imul(c, x | 1);
  }
  const dw = new DataView(out.buffer);
  dw.setUint32(0, a >>> 0, false);
  dw.setUint32(4, b >>> 0, false);
  dw.setUint32(8, c >>> 0, false);
  dw.setUint32(12, d >>> 0, false);
  out[6] = (out[6] & 0x0f) | 0x40;
  out[8] = (out[8] & 0x3f) | 0x80;
  return out;
}

export function stableLocationEventId(
  agentId: string,
  capturedAtMs: number,
  latitude: number,
  longitude: number,
  bucketMs: number = LOCATION_UPDATE_INTERVAL_MS,
): string {
  const agent = agentId.trim().toLowerCase();
  const bucket = Math.floor(capturedAtMs / bucketMs) * bucketMs;
  const key = `${agent}|${bucket}|${latitude}|${longitude}`;
  return bytesToUuid(stableBytesFromKey(key));
}
