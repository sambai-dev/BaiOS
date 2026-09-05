// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { afterEach, describe, expect, it, vi } from "vitest";
import { createMarketCache } from "./market-upstream-cache";

afterEach(() => vi.useRealTimers());

describe("market upstream cache", () => {
  it("coalesces simultaneous requests and reuses fresh responses without upstream work", async () => {
    const cached = createMarketCache<{ value: number; stale: boolean }>();
    let resolve!: (value: { value: number; stale: boolean }) => void;
    const load = vi.fn(() => new Promise<{ value: number; stale: boolean }>((done) => { resolve = done; }));
    const first = cached("btc", 1000, load);
    const second = cached("btc", 1000, load);
    await Promise.resolve();
    expect(load).toHaveBeenCalledTimes(1);
    resolve({ value: 100, stale: false });
    expect(await first).toEqual(await second);
    await cached("btc", 1000, load);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("marks fallback data stale, backs off failures, and never crosses currency/asset keys", async () => {
    vi.useFakeTimers();
    const cached = createMarketCache<{ value: number; stale: boolean }>(120_000);
    await cached("btc:usd", 1000, async () => ({ value: 100, stale: false }));
    await vi.advanceTimersByTimeAsync(1001);
    const fail = vi.fn().mockRejectedValue(new Error("429"));
    expect(await cached("btc:usd", 1000, fail)).toEqual({ value: 100, stale: true });
    await cached("btc:usd", 1000, fail);
    expect(fail).toHaveBeenCalledTimes(1);
    expect(await cached("btc:nzd", 1000, fail)).toBeNull();
    await vi.advanceTimersByTimeAsync(121_000);
    expect(await cached("btc:usd", 1000, fail)).toBeNull();
  });

  it("recovers after a synchronous loader failure rather than keeping a failed in-flight promise", async () => {
    vi.useFakeTimers();
    const cached = createMarketCache<{ stale: boolean }>();
    expect(await cached("cmc", 1000, () => { throw new Error("failed"); })).toBeNull();
    await vi.advanceTimersByTimeAsync(60_001);
    expect(await cached("cmc", 1000, async () => ({ stale: false }))).toEqual({ stale: false });
  });
});
