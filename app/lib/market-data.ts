// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

export const MARKET_COIN_IDS = [
  "bitcoin", "ethereum", "solana", "binancecoin", "ripple", "cardano", "dogecoin", "avalanche-2",
] as const;
export const MARKET_CURRENCIES = ["usd", "nzd"] as const;
export const MARKET_HISTORY_DAYS = [1, 7, 30] as const;

export type MarketCoinId = (typeof MARKET_COIN_IDS)[number];
export type MarketCurrency = (typeof MARKET_CURRENCIES)[number];
export type MarketHistoryDays = (typeof MARKET_HISTORY_DAYS)[number];
export type MarketPricePoint = { timestamp: number; price: number };
export type MarketHistoryQuery = { coin: MarketCoinId; currency: MarketCurrency; days: MarketHistoryDays };

export type MarketHistoryPayload = MarketHistoryQuery & {
  source: "CoinGecko";
  fetchedAt: string;
  sourceUpdatedAt: string;
  stale: boolean;
  intervalMs: number;
  intervalLabel: string;
  points: MarketPricePoint[];
};

export type MarketSentimentPayload = {
  source: "CoinMarketCap";
  sourceUrl: string;
  value: number;
  classification: string;
  fetchedAt: string;
  sourceUpdatedAt: string;
  stale: boolean;
};

export function parseHistoryQuery(search: URLSearchParams):
  | { ok: true; query: MarketHistoryQuery }
  | { ok: false; error: string } {
  for (const name of search.keys()) {
    if (!["coin", "currency", "days"].includes(name)) return { ok: false, error: `Unsupported query parameter: ${name}.` };
    if (search.getAll(name).length !== 1) return { ok: false, error: `Expected exactly one ${name} parameter.` };
  }
  const coin = search.get("coin") ?? "bitcoin";
  const currency = search.get("currency") ?? "usd";
  const days = search.get("days") ?? "7";
  if (!MARKET_COIN_IDS.includes(coin as MarketCoinId)) return { ok: false, error: "Choose a supported market asset." };
  if (!MARKET_CURRENCIES.includes(currency as MarketCurrency)) return { ok: false, error: "Currency must be either usd or nzd." };
  if (!["1", "7", "30"].includes(days)) return { ok: false, error: "History days must be 1, 7, or 30." };
  return { ok: true, query: { coin: coin as MarketCoinId, currency: currency as MarketCurrency, days: Number(days) as MarketHistoryDays } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Keep observed prices and times intact. EMA periods refer to these samples, not days. */
export function normalizeMarketHistory(raw: unknown, query: MarketHistoryQuery, now = Date.now()): MarketHistoryPayload | null {
  if (!isRecord(raw) || !Array.isArray(raw.prices) || raw.prices.length > 2_000) return null;
  const unique = new Map<number, number>();
  for (const entry of raw.prices) {
    if (!Array.isArray(entry)) continue;
    const [timestamp, price] = entry;
    if (!isFiniteNumber(timestamp) || !isFiniteNumber(price) || timestamp <= 0 || timestamp > now + 300_000 || price <= 0) continue;
    unique.set(timestamp, price);
  }
  const points = Array.from(unique, ([timestamp, price]) => ({ timestamp, price })).sort((a, b) => a.timestamp - b.timestamp);
  // A short or corrupt series cannot support both requested indicators.
  if (points.length < 50) return null;
  const gaps = points.slice(1).map((point, index) => point.timestamp - points[index]!.timestamp).sort((a, b) => a - b);
  const intervalMs = gaps[Math.floor(gaps.length / 2)]!;
  const minutes = Math.max(1, Math.round(intervalMs / 60_000));
  const intervalLabel = minutes === 60 ? "Hourly samples" : minutes === 1_440 ? "Daily samples" : `${minutes} min samples`;
  const latest = points[points.length - 1]!;
  return {
    ...query,
    source: "CoinGecko",
    fetchedAt: new Date(now).toISOString(),
    sourceUpdatedAt: new Date(latest.timestamp).toISOString(),
    stale: now - latest.timestamp > Math.max(15 * 60_000, intervalMs * 2),
    intervalMs,
    intervalLabel,
    points,
  };
}

export function normalizeMarketSentiment(raw: unknown, now = Date.now()): MarketSentimentPayload | null {
  if (!isRecord(raw) || !isRecord(raw.data)) return null;
  if (isRecord(raw.status) && raw.status.error_code !== undefined && String(raw.status.error_code) !== "0") return null;
  const data = raw.data;
  if (!isFiniteNumber(data.value) || data.value < 0 || data.value > 100 ||
      typeof data.value_classification !== "string" || !data.value_classification.trim() || data.value_classification.length > 40 ||
      typeof data.update_time !== "string") return null;
  const timestamp = Date.parse(data.update_time);
  if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > now + 300_000) return null;
  return {
    source: "CoinMarketCap",
    sourceUrl: "https://coinmarketcap.com/charts/fear-and-greed-index/",
    value: data.value,
    classification: data.value_classification.trim(),
    fetchedAt: new Date(now).toISOString(),
    sourceUpdatedAt: new Date(timestamp).toISOString(),
    stale: now - timestamp > 60 * 60_000,
  };
}
