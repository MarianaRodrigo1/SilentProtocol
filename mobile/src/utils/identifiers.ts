export function createUuidV4(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function hashText(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
  }
  return `h_${(hash >>> 0).toString(16)}`;
}

export function toMacLikeAddress(id: string): string {
  const hex = hashText(id).replace('h_', '').padEnd(12, '0').slice(0, 12).toUpperCase();
  return hex.match(/.{1,2}/g)?.join(':') ?? 'AA:BB:CC:DD:EE:FF';
}
