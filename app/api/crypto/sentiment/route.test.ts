// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => { vi.resetModules(); vi.stubEnv("COINMARKETCAP_API_KEY", ""); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

const request = (query = "") => new Request(`https://www.sambai.dev/api/crypto/sentiment${query}`);
const index = () => Response.json({ data: { value: 75, value_classification: "Greed", update_time: new Date().toISOString() }, status: { error_code: "0" } });

describe("GET /api/crypto/sentiment", () => {
  it("uses the documented keyless CMC endpoint and caches its actual response", async () => {
    const upstream = vi.fn().mockResolvedValue(index());
    vi.stubGlobal("fetch", upstream);
    const { GET } = await import("./route");
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ source: "CoinMarketCap", value: 75, classification: "Greed", stale: false });
    await GET(request());
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(upstream.mock.calls[0]![0]).toBe("https://pro-api.coinmarketcap.com/public-api/v3/fear-and-greed/latest");
    expect(upstream.mock.calls[0]![1].headers).not.toHaveProperty("X-CMC_PRO_API_KEY");
  });

  it("keeps an optional API key on the server and uses the corresponding keyed endpoint", async () => {
    vi.stubEnv("COINMARKETCAP_API_KEY", "test-key");
    const upstream = vi.fn().mockResolvedValue(index());
    vi.stubGlobal("fetch", upstream);
    const { GET } = await import("./route");
    const response = await GET(request());
    expect(upstream.mock.calls[0]![0]).toBe("https://pro-api.coinmarketcap.com/v3/fear-and-greed/latest");
    expect(upstream.mock.calls[0]![1].headers).toHaveProperty("X-CMC_PRO_API_KEY", "test-key");
    expect(await response.text()).not.toContain("test-key");
  });

  it("rejects extra parameters and reports unavailability instead of substituting another index", async () => {
    const upstream = vi.fn().mockResolvedValue(Response.json({ data: { value: 42 } }));
    vi.stubGlobal("fetch", upstream);
    const { GET } = await import("./route");
    expect((await GET(request("?source=alternative"))).status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ source: "CoinMarketCap", error: expect.any(String) });
  });
});
