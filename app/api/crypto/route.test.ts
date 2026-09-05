// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const ORIGINAL_DEMO_KEY = process.env.COINGECKO_DEMO_API_KEY;

function request(query = "", signal?: AbortSignal) {
  return new Request(`https://www.sambai.dev/api/crypto${query}`, { signal });
}

function marketResponse(lastUpdated = new Date().toISOString()) {
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
        last_updated: lastUpdated,
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
      "no-store",
    );
    expect(body).toMatchObject({ currency: "usd", stale: false });

    const [url, init] = upstream.mock.calls[0] as [
      string,
      RequestInit & { next?: { revalidate?: number } },
    ];
    expect(new URL(url).searchParams.get("vs_currency")).toBe("usd");
    expect(init.cache).toBe("no-store");
    expect(init.next?.revalidate).toBeUndefined();
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

  it("coalesces simultaneous market requests and reuses fresh prices", async () => {
    vi.resetModules();
    const { GET: freshGet } = await import("./route");
    const upstream = vi.fn().mockResolvedValue(marketResponse());
    vi.stubGlobal("fetch", upstream);

    const responses = await Promise.all([
      freshGet(request("?currency=usd")),
      freshGet(request("?currency=usd")),
      freshGet(request("?currency=usd")),
    ]);
    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(upstream).toHaveBeenCalledTimes(1);
    expect((await freshGet(request("?currency=usd"))).status).toBe(200);
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it("backs off an upstream failure without manufacturing market rows", async () => {
    vi.resetModules();
    const { GET: freshGet } = await import("./route");
    const upstream = vi.fn().mockResolvedValue(new Response(null, { status: 429 }));
    vi.stubGlobal("fetch", upstream);

    const response = await freshGet(request());
    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(await response.json()).not.toHaveProperty("coins");
    await freshGet(request());
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it("marks a successful but outdated provider response stale using source time, not fetch time", async () => {
    vi.resetModules();
    const { GET: freshGet } = await import("./route");
    const sourceTime = new Date(Date.now() - 20 * 60_000).toISOString();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(marketResponse(sourceTime)));

    const response = await freshGet(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ stale: true, sourceUpdatedAt: sourceTime });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects a days-old snapshot even when the provider returns HTTP200", async () => {
    vi.resetModules();
    const { GET: freshGet } = await import("./route");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(marketResponse(new Date(Date.now() - 6 * 86_400_000).toISOString())));

    const response = await freshGet(request());
    expect(response.status).toBe(503);
    expect(await response.json()).not.toHaveProperty("coins");
  });

  it("does not let one fresh coin hide an outdated row in the same market response", async () => {
    vi.resetModules();
    const { GET: freshGet } = await import("./route");
    const fresh = await marketResponse().json();
    const old = await marketResponse(new Date(Date.now() - 20 * 60_000).toISOString()).json();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([...fresh, { ...old[0], id: "solana" }])));

    const response = await freshGet(request());
    expect(await response.json()).toMatchObject({ stale: true });
  });

  it("reassesses cached source age without making another upstream request", async () => {
    vi.resetModules();
    const { GET: freshGet } = await import("./route");
    const now = Date.now();
    const upstream = vi.fn().mockResolvedValue(marketResponse(new Date(now - 14 * 60_000).toISOString()));
    vi.stubGlobal("fetch", upstream);
    expect(await (await freshGet(request())).json()).toMatchObject({ stale: false });
    vi.spyOn(Date, "now").mockReturnValue(now + 2 * 60_000);
    expect(await (await freshGet(request())).json()).toMatchObject({ stale: true });
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it("excludes a days-old coin before caching even when another coin is fresh", async () => {
    vi.resetModules();
    const { GET: freshGet } = await import("./route");
    const fresh = await marketResponse().json();
    const expired = await marketResponse(new Date(Date.now() - 6 * 86_400_000).toISOString()).json();
    const upstream = vi.fn().mockResolvedValue(Response.json([...expired, { ...fresh[0], id: "solana" } ]));
    vi.stubGlobal("fetch", upstream);

    const response = await freshGet(request());
    const body = await response.json();
    expect(body.coins.map((coin: { id: string }) => coin.id)).toEqual(["solana"]);
    expect(body.stale).toBe(false);
    expect((await (await freshGet(request())).json()).coins).toEqual(body.coins);
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it("expires individual cached coins and rechecks availability without another upstream fetch", async () => {
    vi.resetModules();
    const { GET: freshGet } = await import("./route");
    const now = Date.now();
    const fresh = await marketResponse().json();
    const expiring = await marketResponse(new Date(now - (24 * 60 - 1) * 60_000).toISOString()).json();
    const upstream = vi.fn().mockResolvedValue(Response.json([...expiring, { ...fresh[0], id: "solana" }]));
    vi.stubGlobal("fetch", upstream);
    expect((await (await freshGet(request())).json()).coins).toHaveLength(2);
    vi.spyOn(Date, "now").mockReturnValue(now + 2 * 60_000);

    const response = await freshGet(request());
    const body = await response.json();
    expect(body.coins.map((coin: { id: string }) => coin.id)).toEqual(["solana"]);
    expect(body.stale).toBe(false);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it("returns503 when the final cached coin expires and never permits edge stale-while-revalidate", async () => {
    vi.resetModules();
    const { GET: freshGet } = await import("./route");
    const now = Date.now();
    const upstream = vi.fn().mockResolvedValue(marketResponse(new Date(now - (24 * 60 - 1) * 60_000).toISOString()));
    vi.stubGlobal("fetch", upstream);
    const initial = await freshGet(request());
    expect(initial.status).toBe(200);
    expect(initial.headers.get("cache-control")).toBe("no-store");
    vi.spyOn(Date, "now").mockReturnValue(now + 2 * 60_000);

    const expired = await freshGet(request());
    expect(expired.status).toBe(503);
    expect(expired.headers.get("cache-control")).toBe("no-store");
    expect(await expired.json()).not.toHaveProperty("coins");
    expect(upstream).toHaveBeenCalledTimes(1);
  });
});
