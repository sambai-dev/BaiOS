// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { NextResponse } from "next/server";
import { createMarketCache } from "../../lib/market-upstream-cache";

export const runtime = "nodejs";
export const maxDuration = 30;

const UPSTREAM_TIMEOUT_MS = 8_000;
const STALE_SOURCE_AGE_MS = 15 * 60_000;
const MAX_SOURCE_AGE_MS = 24 * 60 * 60_000;

const COIN_IDS = [
  "bitcoin",
  "ethereum",
  "solana",
  "binancecoin",
  "ripple",
  "cardano",
  "dogecoin",
  "avalanche-2",
] as const;

const SUPPORTED_CURRENCIES = ["usd", "nzd"] as const;
type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

type CoinGeckoMarket = {
  id?: unknown;
  symbol?: unknown;
  name?: unknown;
  current_price?: unknown;
  market_cap?: unknown;
  market_cap_rank?: unknown;
  total_volume?: unknown;
  high_24h?: unknown;
  low_24h?: unknown;
  price_change_percentage_24h?: unknown;
  price_change_percentage_24h_in_currency?: unknown;
  last_updated?: unknown;
  sparkline_in_7d?: { price?: unknown } | null;
};

type MarketPayload = {
  currency: SupportedCurrency;
  fetchedAt: string;
  sourceUpdatedAt: string;
  stale: boolean;
  coins: Array<{
    id: string;
    symbol: string;
    name: string;
    price: number;
    marketCap: number;
    marketCapRank: number;
    volume24h: number;
    high24h: number;
    low24h: number;
    change24h: number;
    prices24h: number[];
    lastUpdated: string;
  }>;
};

const cached = createMarketCache<MarketPayload>();
const NO_STORE = "no-store";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

type CurrencyResult =
  | { ok: true; currency: SupportedCurrency }
  | { ok: false; error: string };

function parseCurrency(request: Request): CurrencyResult {
  const searchParams = new URL(request.url).searchParams;
  const unsupported = [...searchParams.keys()].find((key) => key !== "currency");
  if (unsupported) {
    return { ok: false, error: `Unsupported query parameter: ${unsupported}.` };
  }

  const values = searchParams.getAll("currency");
  if (!values.length) return { ok: true, currency: "usd" };
  if (values.length !== 1) {
    return { ok: false, error: "Expected exactly one currency parameter." };
  }

  const requested = values[0];
  if (!SUPPORTED_CURRENCIES.includes(requested as SupportedCurrency)) {
    return { ok: false, error: "Currency must be either usd or nzd." };
  }
  return { ok: true, currency: requested as SupportedCurrency };
}

function parseMarket(value: CoinGeckoMarket) {
  if (!value || typeof value !== "object") return null;
  const prices = Array.isArray(value.sparkline_in_7d?.price)
    ? value.sparkline_in_7d.price.filter(isFiniteNumber).slice(-25)
    : [];
  const change = isFiniteNumber(value.price_change_percentage_24h_in_currency)
    ? value.price_change_percentage_24h_in_currency
    : value.price_change_percentage_24h;

  if (
    typeof value.id !== "string" ||
    typeof value.symbol !== "string" ||
    typeof value.name !== "string" ||
    !isFiniteNumber(value.current_price) ||
    !isFiniteNumber(value.market_cap) ||
    !isFiniteNumber(value.market_cap_rank) ||
    !isFiniteNumber(value.total_volume) ||
    !isFiniteNumber(value.high_24h) ||
    !isFiniteNumber(value.low_24h) ||
    !isFiniteNumber(change) ||
    typeof value.last_updated !== "string" ||
    !Number.isFinite(Date.parse(value.last_updated)) ||
    Date.parse(value.last_updated) > Date.now() + 300_000 ||
    prices.length < 2
  ) {
    return null;
  }

  return {
    id: value.id,
    symbol: value.symbol.toUpperCase(),
    name: value.name,
    price: value.current_price,
    marketCap: value.market_cap,
    marketCapRank: value.market_cap_rank,
    volume24h: value.total_volume,
    high24h: value.high_24h,
    low24h: value.low_24h,
    change24h: change,
    prices24h: prices,
    lastUpdated: value.last_updated,
  };
}

/**
 * Bounds the upstream call and aborts the underlying request when the deadline
 * expires. Coalesced requests share this deadline independently of any one
 * visitor disconnecting; cancelled clients still receive no response body.
 */
async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;

  return fetch(url, { ...init, signal });
}

export async function GET(request: Request) {
  const parsedCurrency = parseCurrency(request);
  if (!parsedCurrency.ok) {
    return NextResponse.json(
      { error: parsedCurrency.error },
      { status: 400, headers: { "Cache-Control": NO_STORE } },
    );
  }
  if (request.signal.aborted) {
    return new Response(null, { status: 499, headers: { "Cache-Control": NO_STORE } });
  }
  const { currency } = parsedCurrency;
  const query = new URLSearchParams({
    vs_currency: currency,
    ids: COIN_IDS.join(","),
    order: "market_cap_desc",
    sparkline: "true",
    price_change_percentage: "24h",
    locale: "en",
    precision: "full",
  });
  const demoKey = process.env.COINGECKO_DEMO_API_KEY?.trim();

  const payload = await cached(currency, 300_000, async () => {
    const response = await fetchWithTimeout(
      `https://api.coingecko.com/api/v3/coins/markets?${query.toString()}`,
      {
        headers: {
          Accept: "application/json",
          ...(demoKey ? { "x-cg-demo-api-key": demoKey } : {}),
        },
        // The bounded cache above owns freshness. A second persistent Next
        // cache can return an old provider snapshot while this load succeeds.
        cache: "no-store",
      },
    );

    if (!response.ok) {
      // Release the unread body so the pooled socket is not pinned until GC.
      await response.body?.cancel().catch(() => {});
      throw new Error(`CoinGecko responded with ${response.status}.`);
    }

    const raw: unknown = await response.json();
    if (!Array.isArray(raw)) {
      throw new Error("CoinGecko returned an unexpected response.");
    }

    const coins = raw
      .map((item) => parseMarket(item as CoinGeckoMarket))
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter((coin) => Date.now() - Date.parse(coin.lastUpdated) <= MAX_SOURCE_AGE_MS)
      .sort((left, right) => left.marketCapRank - right.marketCapRank);

    if (!coins.length) {
      throw new Error("CoinGecko returned no usable market rows.");
    }

    // coins is non-empty (checked above); keep the invariant explicit for TS.
    const firstCoin = coins[0];
    if (!firstCoin) throw new Error("CoinGecko returned no usable market rows.");
    const sourceUpdatedAt = coins.reduce(
      (latest, coin) =>
        Date.parse(coin.lastUpdated) > Date.parse(latest) ? coin.lastUpdated : latest,
      firstCoin.lastUpdated,
    );
    return {
      currency,
      fetchedAt: new Date().toISOString(),
      sourceUpdatedAt,
      // The cache sets this flag on failed refreshes. Source age is assessed
      // separately below, after individual expired rows have been removed.
      stale: false,
      coins,
    };
  });
  if (request.signal.aborted) {
    return new Response(null, { status: 499, headers: { "Cache-Control": NO_STORE } });
  }
  const coins = payload?.coins.filter(
    (coin) => Date.now() - Date.parse(coin.lastUpdated) <= MAX_SOURCE_AGE_MS,
  ) ?? [];
  const firstCoin = coins[0];
  if (!payload || !firstCoin) {
    return NextResponse.json(
      {
        error: "Market data is unavailable right now. Try again in a moment.",
      },
      {
        status: 503,
        headers: { "Cache-Control": NO_STORE, "Retry-After": "60" },
      },
    );
  }
  // Reassess source age even while the in-memory response is still cached.
  const stale = payload.stale || coins.some(
    (coin) => Date.now() - Date.parse(coin.lastUpdated) > STALE_SOURCE_AGE_MS,
  );
  const sourceUpdatedAt = coins.reduce(
    (latest, coin) => Date.parse(coin.lastUpdated) > Date.parse(latest) ? coin.lastUpdated : latest,
    firstCoin.lastUpdated,
  );
  return NextResponse.json({ ...payload, coins, sourceUpdatedAt, stale }, {
    headers: {
      // Each response must pass through source-age checks. The per-currency
      // memory cache already prevents another upstream call for five minutes.
      "Cache-Control": NO_STORE,
    },
  });
}
