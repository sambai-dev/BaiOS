// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { describe, expect, it } from "vitest";
import { normalizeMarketHistory, normalizeMarketSentiment, parseHistoryQuery } from "./market-data";

const now = Date.parse("2026-09-05T04:00:00Z");
const query = { coin: "bitcoin", currency: "usd", days: 7 } as const;
const prices = Array.from({ length: 60 }, (_, i) => [now - (59 - i) * 3_600_000, 100 + i]);

describe("market data normalization", () => {
  it("preserves actual source samples, orders them, and removes invalid and duplicate timestamps", () => {
    const result = normalizeMarketHistory({ prices: [...prices.toReversed(), prices[0], [now, -4], [Infinity, 10], [now + 400_000, 10], [now, "200"]] }, query, now);
    expect(result?.points).toEqual(prices.map(([timestamp, price]) => ({ timestamp, price })));
    expect(result).toMatchObject({ intervalMs: 3_600_000, intervalLabel: "Hourly samples", sourceUpdatedAt: new Date(now).toISOString(), stale: false });
  });

  it("labels 5 minute data honestly and flags old source timestamps", () => {
    const points = Array.from({ length: 60 }, (_, i) => [now - (59 - i) * 300_000, 5]);
    const result = normalizeMarketHistory({ prices: points }, { ...query, days: 1 }, now);
    expect(result?.intervalLabel).toBe("5 min samples");
    expect(normalizeMarketHistory({ prices: points }, query, now + 3_600_000)?.stale).toBe(true);
  });

  it("rejects insufficient EMA history and unexpectedly huge arrays without making up samples", () => {
    expect(normalizeMarketHistory({ prices: prices.slice(0, 49) }, query, now)).toBeNull();
    expect(normalizeMarketHistory({ prices: Array(2_001).fill(prices[0]) }, query, now)).toBeNull();
    expect(normalizeMarketHistory(null, query, now)).toBeNull();
  });

  it("bounds every upstream query dimension and rejects duplicates", () => {
    expect(parseHistoryQuery(new URLSearchParams())).toEqual({ ok: true, query });
    expect(parseHistoryQuery(new URLSearchParams("coin=solana&currency=nzd&days=30"))).toMatchObject({ ok: true, query: { coin: "solana", currency: "nzd", days: 30 } });
    for (const search of ["coin=unknown", "coin=bitcoin&coin=solana", "currency=USD", "currency=", "days=365", "days=07", "days=", "url=https://other.test"]) {
      expect(parseHistoryQuery(new URLSearchParams(search)).ok).toBe(false);
    }
  });

  it("uses only the actual CMC value, classification, and source timestamp", () => {
    const raw = { data: { value: 75, value_classification: "Greed", update_time: new Date(now).toISOString() }, status: { error_code: "0" } };
    expect(normalizeMarketSentiment(raw, now)).toMatchObject({ source: "CoinMarketCap", value: 75, classification: "Greed", stale: false, sourceUpdatedAt: new Date(now).toISOString() });
    expect(normalizeMarketSentiment(raw, now + 7_200_000)?.stale).toBe(true);
    expect(normalizeMarketSentiment({ ...raw, status: { error_code: 1001 } }, now)).toBeNull();
    for (const patch of [{ value: 101 }, { value: -1 }, { value: "75" }, { update_time: "bad date" }, { update_time: new Date(now + 600_000).toISOString() }, { value_classification: "" }]) {
      expect(normalizeMarketSentiment({ data: { ...raw.data, ...patch } }, now)).toBeNull();
    }
  });
});
