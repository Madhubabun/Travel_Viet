/**
 * Tiny Cache Storage helper: fetch a cross-origin image once, keep it on the device,
 * and hand back an object URL. Falls back to the network URL when anything fails.
 */

const putCounts = new Map<string, number>();

function hasCaches(): boolean {
  return typeof caches !== 'undefined' && typeof window !== 'undefined' && window.isSecureContext;
}

function cleanUrl(url: string): string {
  // Strip analytics query strings (Wikimedia adds utm_* params) so cache keys stay stable.
  const u = new URL(url);
  for (const k of [...u.searchParams.keys()]) if (k.startsWith('utm_')) u.searchParams.delete(k);
  return u.toString();
}

export async function cachedObjectUrl(cacheName: string, url: string, maxEntries: number): Promise<string> {
  const key = cleanUrl(url);
  if (!hasCaches()) return key;
  try {
    const cache = await caches.open(cacheName);
    const hit = await cache.match(key);
    if (hit) return URL.createObjectURL(await hit.blob());
    const res = await fetch(key, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) return key;
    await cache.put(key, res.clone());
    const n = (putCounts.get(cacheName) ?? 0) + 1;
    putCounts.set(cacheName, n);
    if (n % 40 === 0) void trim(cache, maxEntries);
    return URL.createObjectURL(await res.blob());
  } catch {
    return key;
  }
}

async function trim(cache: Cache, maxEntries: number) {
  const keys = await cache.keys();
  const excess = keys.length - maxEntries;
  for (let i = 0; i < excess; i++) await cache.delete(keys[i]);
}

export function revokeIfBlob(src: string | null | undefined) {
  if (src && src.startsWith('blob:')) URL.revokeObjectURL(src);
}
