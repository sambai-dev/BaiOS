// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const request = (query = "") => new Request(`https://www.sambai.dev/api/crypto/history${query}`);

beforeEach(() => { vi.resetModules(); vi.stubEnv("COINGECKO_DEMO_API_KEY", ""); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("GET /api/crypto/history", () => {
  it("serves real timestamped history through an allowlisted URL and caches repeated requests", async () => {
    const now = Date.now();
    const prices = Array.from({ length: 60 }, (_, i) => [now - (59 - i) * 3_600_000, 100 + i]);
    const upstream = vi.fn().mockResolvedValue(Response.json({ prices }));
    vi.stubGlobal("fetch", upstream);
    const { GET } = await import("./route");
    const response = await GET(request("?coin=solana&currency=nzd&days=7"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ coin: "solana", currency: "nzd", points: prices.map(([timestamp, price]) => ({ timestamp, price })) });
    await GET(request("?coin=solana&currency=nzd&days=7"));
    expect(upstream).toHaveBeenCalledTimes(1);
    const [url, init] = upstream.mock.calls[0]!;
    expect(new URL(url).pathname).toBe("/api/v3/coins/solana/market_chart");
    expect(new URL(url).searchParams.get("vs_currency")).toBe("nzd");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects invalid input before fetching and returns no invented data on upstream failure", async () => {
    const upstream = vi.fn().mockResolvedValue(new Response(null, { status: 429 }));
    vi.stubGlobal("fetch", upstream);
    const { GET } = await import("./route");
    expect((await GET(request("?coin=../../other"))).status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).not.toHaveProperty("points");
    await GET(request());
    expect(upstream).toHaveBeenCalledTimes(1);
  });
});
