// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { NextResponse } from "next/server";
import { normalizeMarketSentiment, type MarketSentimentPayload } from "../../../lib/market-data";
import { createMarketCache, fetchMarketJson } from "../../../lib/market-upstream-cache";

export const runtime = "nodejs";
export const maxDuration = 15;

const cached = createMarketCache<MarketSentimentPayload>();

export async function GET(request: Request) {
  if (new URL(request.url).searchParams.size) return NextResponse.json({ error: "This endpoint does not accept query parameters." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  if (request.signal.aborted) return new Response(null, { status: 499 });
  const payload = await cached("cmc", 15 * 60_000, async () => {
    // Both paths are documented CMC APIs. The public path requires no key.
    // https://coinmarketcap.com/api/documentation/pro-api-reference/keyless-public-api
    const key = process.env.COINMARKETCAP_API_KEY?.trim();
    const base = key ? "https://pro-api.coinmarketcap.com" : "https://pro-api.coinmarketcap.com/public-api";
    const raw = await fetchMarketJson(`${base}/v3/fear-and-greed/latest`, key ? { "X-CMC_PRO_API_KEY": key } : {});
    const normalized = normalizeMarketSentiment(raw);
    if (!normalized) throw new Error("CoinMarketCap returned no usable index.");
    return normalized;
  });
  if (request.signal.aborted) return new Response(null, { status: 499 });
  if (!payload) return NextResponse.json({ source: "CoinMarketCap", error: "CoinMarketCap's index is unavailable. Try again in a minute." }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } });
  return NextResponse.json(payload, { headers: { "Cache-Control": `public, s-maxage=${payload.stale ? 60 : 900}` } });
}
