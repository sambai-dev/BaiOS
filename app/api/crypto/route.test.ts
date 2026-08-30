// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const ORIGINAL_DEMO_KEY = process.env.COINGECKO_DEMO_API_KEY;

function request(query = "", signal?: AbortSignal) {
  return new Request(`https://www.sambai.dev/api/crypto${query}`, { signal });
}

function marketResponse() {
  return new Response(
    JSON.stringify([
      {
        id: "bitcoin",
        symbol: "btc",
        name: "Bitcoin",
        current_price: 100,
        market_cap: 1_000,
        market_cap_rank: 1,
        total_volume: 500,
        high_24h: 110,
        low_24h: 90,
        price_change_percentage_24h: 2,
        price_change_percentage_24h_in_currency: 2,
        last_updated: "2026-08-30T00:00:00.000Z",
        sparkline_in_7d: { price: [90, 95, 100] },
      },
    ]),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("GET /api/crypto", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    if (ORIGINAL_DEMO_KEY === undefined) delete process.env.COINGECKO_DEMO_API_KEY;
    else process.env.COINGECKO_DEMO_API_KEY = ORIGINAL_DEMO_KEY;
  });

  it("rejects unsupported, duplicate, and unknown query parameters before fetch", async () => {
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);

    const invalidQueries = [
      "?currency=bogus",
      "?currency=",
      "?currency=USD",
      "?currency=usd&currency=nzd",
      "?currency=usd&extra=1",
      "?extra=1",
    ];

    for (const query of invalidQueries) {
      const response = await GET(request(query));
      expect(response.status).toBe(400);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toHaveProperty("error");
    }

    expect(upstream).not.toHaveBeenCalled();
  });

  it("defaults a parameter-free request to the canonical USD representation", async () => {
    const upstream = vi.fn().mockResolvedValue(marketResponse());
    vi.stubGlobal("fetch", upstream);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, s-maxage=300, stale-while-revalidate=1800",
    );
    expect(body).toMatchObject({ currency: "usd", stale: false });

    const [url, init] = upstream.mock.calls[0] as [
      string,
      RequestInit & { next?: { revalidate?: number } },
    ];
    expect(new URL(url).searchParams.get("vs_currency")).toBe("usd");
    expect(init.next?.revalidate).toBe(300);
  });

  it("accepts the exact lowercase NZD representation", async () => {
    const upstream = vi.fn().mockResolvedValue(marketResponse());
    vi.stubGlobal("fetch", upstream);

    const response = await GET(request("?currency=nzd"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ currency: "nzd", stale: false });
    const [url] = upstream.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).searchParams.get("vs_currency")).toBe("nzd");
  });

  it("never serves a primed USD fallback to a later invalid request", async () => {
    const upstream = vi.fn().mockResolvedValue(marketResponse());
    vi.stubGlobal("fetch", upstream);
    expect((await GET(request("?currency=usd"))).status).toBe(200);
    upstream.mockClear();

    const invalid = await GET(request("?currency=not-a-currency"));

    expect(invalid.status).toBe(400);
    expect(invalid.headers.get("cache-control")).toBe("no-store");
    expect(upstream).not.toHaveBeenCalled();
  });

  it("stops quietly when the client request is already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const upstream = vi.fn((_url: string, init: RequestInit) => {
      expect(init.signal?.aborted).toBe(true);
      return Promise.reject(init.signal?.reason);
    });
    vi.stubGlobal("fetch", upstream);

    const response = await GET(request("?currency=usd", controller.signal));

    expect(response.status).toBe(499);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toBe("");
    expect(errorLog).not.toHaveBeenCalled();
  });
});
