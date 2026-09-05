// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

/** Per-process coalescing bounds bursts; route CDN headers also cache across visitors. */
export function createMarketCache<T extends { stale: boolean }>(maxStaleMs = 24 * 60 * 60_000) {
  const entries = new Map<string, { value: T; storedAt: number }>();
  const pending = new Map<string, Promise<T | null>>();
  const retryAfter = new Map<string, number>();

  function fallback(key: string): T | null {
    const entry = entries.get(key);
    return entry && Date.now() - entry.storedAt <= maxStaleMs ? { ...entry.value, stale: true } : null;
  }

  return async function get(key: string, freshMs: number, load: () => Promise<T>): Promise<T | null> {
    const entry = entries.get(key);
    if (entry && Date.now() - entry.storedAt < freshMs) return entry.value;
    const flight = pending.get(key);
    if (flight) return flight;
    if ((retryAfter.get(key) ?? 0) > Date.now()) return fallback(key);

    const work = (async () => {
      try {
        const value = await Promise.resolve().then(load);
        entries.set(key, { value, storedAt: Date.now() });
        retryAfter.delete(key);
        return value;
      } catch {
        // Avoid turning an upstream outage/rate limit into a request storm.
        retryAfter.set(key, Date.now() + 60_000);
        return fallback(key);
      } finally {
        pending.delete(key);
      }
    })();
    pending.set(key, work);
    return work;
  };
}

/** Shared requests outlive an individual client, but never the upstream deadline. */
export async function fetchMarketJson(url: string, headers: Record<string, string>): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/json", ...headers },
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new Error(`Market source returned HTTP ${response.status}.`);
  }
  return response.json();
}
