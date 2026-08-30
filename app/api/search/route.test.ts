// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const SUCCESS_CACHE =
  "public, max-age=0, s-maxage=600, stale-while-revalidate=86400";

function request(query = "", signal?: AbortSignal) {
  return new Request(`https://www.sambai.dev/api/search${query}`, { signal });
}

function searchResponse(hits: Array<{ title: string; snippet?: string }>) {
  return new Response(JSON.stringify({ query: { search: hits } }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("GET /api/search", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("normalizes the query, reuses one deadline, and caches both upstream phases", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    const upstream = vi
      .fn()
      .mockResolvedValueOnce(
        searchResponse([
          { title: "Ada Lovelace", snippet: "English mathematician" },
          { title: "Analytical Engine", snippet: "Mechanical computer" },
        ]),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            extract: "Ada Lovelace was an English mathematician.",
            content_urls: {
              desktop: { page: "https://en.wikipedia.org/wiki/Ada_Lovelace" },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", upstream);

    const response = await GET(request("?q=%20Ada%20%20Lovelace%20"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(SUCCESS_CACHE);
    expect(body).toMatchObject({ query: "Ada Lovelace", heading: "Ada Lovelace" });
    expect(upstream).toHaveBeenCalledTimes(2);
    expect(timeoutSpy).toHaveBeenCalledOnce();
    expect(timeoutSpy).toHaveBeenCalledWith(8_000);

    const [searchUrl, searchInit] = upstream.mock.calls[0] as [
      string,
      RequestInit & { next?: { revalidate?: number } },
    ];
    const [, summaryInit] = upstream.mock.calls[1] as [
      string,
      RequestInit & { next?: { revalidate?: number } },
    ];
    expect(new URL(searchUrl).searchParams.get("srsearch")).toBe("Ada Lovelace");
    expect(searchInit.signal).toBe(summaryInit.signal);
    expect(searchInit.next?.revalidate).toBe(600);
    expect(summaryInit.next?.revalidate).toBe(600);
  });

  it("caches a successful empty result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(searchResponse([])));

    const response = await GET(request("?q=no-result"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(SUCCESS_CACHE);
    expect(await response.json()).toMatchObject({ query: "no-result", related: [] });
  });

  it("marks validation and upstream errors no-store", async () => {
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);

    const missing = await GET(request());
    expect(missing.status).toBe(400);
    expect(missing.headers.get("cache-control")).toBe("no-store");
    expect(upstream).not.toHaveBeenCalled();

    upstream.mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    const unavailable = await GET(request("?q=Ada"));
    expect(unavailable.status).toBe(502);
    expect(unavailable.headers.get("cache-control")).toBe("no-store");
  });

  it("does not cache a degraded success when the summary phase fails", async () => {
    const upstream = vi
      .fn()
      .mockResolvedValueOnce(searchResponse([{ title: "Ada Lovelace" }]))
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    vi.stubGlobal("fetch", upstream);

    const response = await GET(request("?q=Ada"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      heading: "Ada Lovelace",
      abstract: { text: "" },
    });
  });

  it("returns a distinct no-store timeout", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("Timed out", "TimeoutError")),
    );

    const response = await GET(request("?q=Ada"));

    expect(response.status).toBe(504);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: "The search provider took too long to respond.",
    });
  });

  it("returns a distinct no-store cancellation", async () => {
    const controller = new AbortController();
    const upstream = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init.signal;
          if (signal?.aborted) {
            reject(signal.reason);
            return;
          }
          signal?.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
        }),
    );
    vi.stubGlobal("fetch", upstream);

    const pendingResponse = GET(request("?q=Ada", controller.signal));
    await vi.waitFor(() => expect(upstream).toHaveBeenCalledOnce());
    const [, init] = upstream.mock.calls[0] as [string, RequestInit];
    expect(init.signal?.aborted).toBe(false);

    controller.abort();
    const response = await pendingResponse;

    expect(response.status).toBe(499);
    expect(init.signal?.aborted).toBe(true);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toBe("");
  });
});
