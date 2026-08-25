// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const ORIGINAL_API_KEY = process.env.OPENROUTER_API_KEY;
const ORIGINAL_MODEL = process.env.OPENROUTER_MODEL;

function request(body: string, headers: Record<string, string> = {}) {
  return new Request("https://www.sambai.dev/api/ai", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://www.sambai.dev",
      "sec-fetch-site": "same-origin",
      ...headers,
    },
    body,
  });
}

describe("POST /api/ai", () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.OPENROUTER_MODEL = "private-model";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (ORIGINAL_API_KEY === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = ORIGINAL_API_KEY;
    if (ORIGINAL_MODEL === undefined) delete process.env.OPENROUTER_MODEL;
    else process.env.OPENROUTER_MODEL = ORIGINAL_MODEL;
  });

  it("rejects requests without a matching browser origin before calling upstream", async () => {
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);

    const rejectedHeaders: Array<Record<string, string>> = [
      { origin: "https://attacker.example" },
      { origin: "https://www.sambai.dev", "sec-fetch-site": "cross-site" },
      { origin: "" },
    ];
    for (const headers of rejectedHeaders) {
      const response = await POST(request('{"messages":[]}', headers));
      expect(response.status).toBe(403);
    }

    expect(upstream).not.toHaveBeenCalled();
  });

  it("rejects oversized bodies before calling upstream", async () => {
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);

    const response = await POST(request("{}", { "content-length": "64001" }));

    expect(response.status).toBe(413);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("preserves same-origin inference without disclosing the provider model", async () => {
    const upstream = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "<think>hidden</think> safe" } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", upstream);

    const response = await POST(
      request(
        JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
          stream: false,
        }),
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ content: "safe" });
    expect(upstream).toHaveBeenCalledOnce();
    const [, init] = upstream.mock.calls[0] as [string, RequestInit];
    const forwarded = JSON.parse(String(init.body));
    expect(forwarded).toMatchObject({
      model: "private-model",
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 900,
      stream: false,
    });
    expect(init.signal).toBeDefined();
  });

  it("removes provider metadata from streamed events", async () => {
    const upstream = vi.fn().mockResolvedValue(
      new Response(
        [
          'data: {"id":"secret-id","model":"private-model","provider":"private-provider","choices":[{"delta":{"content":"safe"}}]}',
          "",
          'data: {"model":"private-model","usage":{"completion_tokens":1},"choices":[]}',
          "",
          "data: [DONE]",
          "",
        ].join("\n"),
        { status: 200, headers: { "content-type": "text/event-stream" } },
      ),
    );
    vi.stubGlobal("fetch", upstream);

    const response = await POST(
      request(
        JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
          stream: true,
        }),
      ),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('"content":"safe"');
    expect(body).toContain('"completion_tokens":1');
    expect(body).toContain("data: [DONE]");
    expect(body).not.toContain("private-model");
    expect(body).not.toContain("private-provider");
    expect(body).not.toContain("secret-id");
  });
});
