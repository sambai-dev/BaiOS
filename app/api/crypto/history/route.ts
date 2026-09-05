// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { NextResponse } from "next/server";
import { normalizeMarketHistory, parseHistoryQuery, type MarketHistoryPayload } from "../../../lib/market-data";
import { createMarketCache, fetchMarketJson } from "../../../lib/market-upstream-cache";

export const runtime = "nodejs";
export const maxDuration = 15;

const cached = createMarketCache<MarketHistoryPayload>();

export async function GET(request: Request) {
  const parsed = parseHistoryQuery(new URL(request.url).searchParams);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400, headers: { "Cache-Control": "no-store" } });
  if (request.signal.aborted) return new Response(null, { status: 499 });
  const { query } = parsed;
  const ttl = query.days === 1 ? 300 : 1_800;
  const payload = await cached(`${query.coin}:${query.currency}:${query.days}`, ttl * 1_000, async () => {
    const params = new URLSearchParams({ vs_currency: query.currency, days: String(query.days), precision: "full" });
    const demoKey = process.env.COINGECKO_DEMO_API_KEY?.trim();
    const raw = await fetchMarketJson(`https://api.coingecko.com/api/v3/coins/${query.coin}/market_chart?${params}`, demoKey ? { "x-cg-demo-api-key": demoKey } : {});
    const normalized = normalizeMarketHistory(raw, query);
    if (!normalized) throw new Error("CoinGecko returned no usable history.");
    return normalized;
  });
  if (request.signal.aborted) return new Response(null, { status: 499 });
  if (!payload) return NextResponse.json({ error: "Price history is unavailable. Try again in a minute." }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } });
  return NextResponse.json(payload, { headers: { "Cache-Control": `public, s-maxage=${payload.stale ? 60 : ttl}` } });
}
