// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const UPSTREAM_TIMEOUT_MS = 8_000;

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

const fallbackCache = new Map<SupportedCurrency, MarketPayload>();

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseCurrency(request: Request): SupportedCurrency {
  const requested = new URL(request.url).searchParams.get("currency")?.toLowerCase();
  return SUPPORTED_CURRENCIES.includes(requested as SupportedCurrency)
    ? (requested as SupportedCurrency)
    : "usd";
}

function parseMarket(value: CoinGeckoMarket) {
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
 * expires. The incoming request signal is combined with the timeout signal so
 * a disconnected client also cancels the CoinGecko request.
 */
async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;

  return fetch(url, { ...init, signal });
}

export async function GET(request: Request) {
  const currency = parseCurrency(request);
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

  try {
    const response = await fetchWithTimeout(
      `https://api.coingecko.com/api/v3/coins/markets?${query.toString()}`,
      {
        headers: {
          Accept: "application/json",
          ...(demoKey ? { "x-cg-demo-api-key": demoKey } : {}),
        },
        next: { revalidate: 300 },
        signal: request.signal,
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
    const payload: MarketPayload = {
      currency,
      fetchedAt: new Date().toISOString(),
      sourceUpdatedAt,
      stale: false,
      coins,
    };
    fallbackCache.set(currency, payload);

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800",
      },
    });
  } catch (caught) {
    console.error("[api/crypto] upstream failure:", caught);
    const fallback = fallbackCache.get(currency);
    if (fallback) {
      return NextResponse.json(
        { ...fallback, stale: true },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
          },
        },
      );
    }

    return NextResponse.json(
      {
        error: "Market data is unavailable right now. Try again in a moment.",
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
