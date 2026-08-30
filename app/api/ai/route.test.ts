// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const ORIGINAL_API_KEY = process.env.OPENROUTER_API_KEY;
const ORIGINAL_MODEL = process.env.OPENROUTER_MODEL;
const PRIVATE_AI_CACHE_CONTROL = "private, no-store, no-transform";
let requestSequence = 0;

function request(
  body: string,
  headers: Record<string, string> = {},
  signal?: AbortSignal,
) {
  requestSequence += 1;
  return new Request("https://www.sambai.dev/api/ai", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://www.sambai.dev",
      "sec-fetch-site": "same-origin",
      "x-forwarded-for": `192.0.2.${requestSequence}`,
      ...headers,
    },
    body,
    signal,
  });
}

function expectPrivate(response: Response) {
  expect(response.headers.get("cache-control")).toBe(PRIVATE_AI_CACHE_CONTROL);
}

function chunkedStream(chunks: string[]) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

describe("POST /api/ai", () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.OPENROUTER_MODEL = "private-model";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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
      expectPrivate(response);
    }

    expect(upstream).not.toHaveBeenCalled();
  });

  it("rejects oversized bodies before calling upstream", async () => {
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);

    const response = await POST(request("{}", { "content-length": "64001" }));

    expect(response.status).toBe(413);
    expectPrivate(response);
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
    expectPrivate(response);
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
          'data: {"id":"secret-id","model":"private-model","provider":"private-provider","choices":[{"delta":{"content":"safe","reasoning":"private-chain","reasoning_details":[{"signature":"secret-signature","provider":"private-provider"}],"tool_calls":[{"id":"private-tool"}]},"logprobs":{"content":"private-logprob"},"provider":"private-choice"},{"delta":{"content":"private-second-choice"}}]}',
          "",
          'data: {"model":"private-model","usage":{"completion_tokens":1,"cost":0.123,"account_id":"private-account","cost_details":{"upstream_inference_cost":0.1}},"choices":[]}',
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
    expectPrivate(response);
    expect(response.headers.get("content-type")).toBe(
      "text/event-stream; charset=utf-8",
    );
    expect(body).toBe(
      [
        'data: {"choices":[{"delta":{"content":"safe"}}]}',
        "",
        "data: [DONE]",
        "",
        "",
      ].join("\n"),
    );
    for (const secret of [
      "private-chain",
      "secret-signature",
      "private-provider",
      "private-tool",
      "private-logprob",
      "private-choice",
      "private-second-choice",
      "private-account",
      "upstream_inference_cost",
      '"cost"',
      '"usage"',
      "secret-id",
    ]) {
      expect(body).not.toContain(secret);
    }
  });

  it("normalizes CRLF events split across transport chunks", async () => {
    const upstream = vi.fn().mockResolvedValue(
      new Response(
        chunkedStream([
          'data: {"choices":[{"delta":{"cont',
          'ent":"safe"}}]}\r',
          "\n\r",
          '\ndata: {"usage":{"completion_tokens":1},"model":"secret"}\r\n',
          "\r\ndata: [DO",
          "NE]\r\n\r\n",
        ]),
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

    expectPrivate(response);
    expect(body).toBe(
      [
        'data: {"choices":[{"delta":{"content":"safe"}}]}',
        "",
        "data: [DONE]",
        "",
        "",
      ].join("\n"),
    );
    expect(body).not.toContain("secret");
  });

  it("strips reasoning tags even when they span streamed events", async () => {
    const upstream = vi.fn().mockResolvedValue(
      new Response(
        chunkedStream([
          'data: {"choices":[{"delta":{"content":"Before <THI"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"NK>private"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":" chain</THI"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"NK> after"}}]}\n\n',
          "data: [DONE]\n\n",
        ]),
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

    expect(body).toContain('"content":"Before "');
    expect(body).toContain('"content":" after"');
    expect(body).toContain("data: [DONE]");
    expect(body).not.toContain("private");
    expect(body.toLowerCase()).not.toContain("<think>");
    expect(body.toLowerCase()).not.toContain("</think>");
  });

  it("turns non-string content into a sanitized stream error", async () => {
    const upstream = vi.fn().mockResolvedValue(
      new Response(
        'data: {"choices":[{"delta":{"content":{"text":"private"}}}]}\n\n',
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

    expect(body).toBe(
      'data: {"error":"The upstream model stream returned invalid text data."}\n\n',
    );
    expect(body).not.toContain("private");
  });

  it("fails closed when one upstream event exceeds the size limit", async () => {
    const upstream = vi.fn().mockResolvedValue(
      new Response(
        chunkedStream([
          "data: ",
          "x".repeat(32_000),
          "x".repeat(33_000),
        ]),
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

    expectPrivate(response);
    expect(body).toBe(
      'data: {"error":"The upstream model stream exceeded the event size limit."}\n\n',
    );
    expect(body).not.toContain("x".repeat(100));
  });

  it("bounds a multi-line event before its delimiter", async () => {
    const oversizedEvent = Array.from(
      { length: 70 },
      () => `data: ${"x".repeat(1_000)}\n`,
    );
    const upstream = vi.fn().mockResolvedValue(
      new Response(chunkedStream(oversizedEvent), {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      }),
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

    expect(await response.text()).toBe(
      'data: {"error":"The upstream model stream exceeded the event size limit."}\n\n',
    );
  });

  it("does not drain the whole upstream while the client is not reading", async () => {
    const encoder = new TextEncoder();
    let pulls = 0;
    const upstreamBody = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        controller.enqueue(
          encoder.encode(
            `data: {"choices":[{"delta":{"content":"${pulls}"}}]}\n\n`,
          ),
        );
        if (pulls >= 50) controller.close();
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(upstreamBody, {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
      ),
    );

    const response = await POST(
      request(
        JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
          stream: true,
        }),
      ),
    );
    await vi.waitFor(() => expect(pulls).toBeGreaterThan(0));

    expect(pulls).toBeLessThan(10);
    await response.body?.cancel();
  });

  it("preserves a sanitized streamed provider error", async () => {
    const upstream = vi.fn().mockResolvedValue(
      new Response(
        'data: {"error":{"code":429,"message":"private provider detail"},"model":"secret"}\n\n',
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

    expectPrivate(response);
    expect(body).toContain(
      'data: {"error":"The model is rate limited. Give it a moment."}',
    );
    expect(body).not.toContain("private provider detail");
    expect(body).not.toContain("secret");
    expect(body).not.toContain("[DONE]");
  });

  it("turns an upstream EOF without DONE into an explicit stream error", async () => {
    const upstream = vi.fn().mockResolvedValue(
      new Response('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n', {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      }),
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

    expectPrivate(response);
    expect(body).toContain('"content":"partial"');
    expect(body).toContain(
      'data: {"error":"The model stream ended before confirming completion."}',
    );
    expect(body).not.toContain("[DONE]");
  });

  it("turns a post-header body timeout into a typed stream error", async () => {
    const encoder = new TextEncoder();
    let sentPartial = false;
    const bodyStream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (!sentPartial) {
          sentPartial = true;
          controller.enqueue(
            encoder.encode(
              'data: {"choices":[{"delta":{"content":"partial"}}]}\n\n',
            ),
          );
          return;
        }
        controller.error(new DOMException("Timed out", "TimeoutError"));
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(bodyStream, {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
      ),
    );

    const response = await POST(
      request(
        JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
          stream: true,
        }),
      ),
    );
    const body = await response.text();

    expectPrivate(response);
    expect(body).toContain('"content":"partial"');
    expect(body).toContain(
      'data: {"error":"The model stream timed out before completion."}',
    );
    expect(body).not.toContain("[DONE]");
  });

  it("returns a distinct no-store timeout response", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("Timed out", "TimeoutError")),
    );

    const response = await POST(
      request(
        JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
          stream: true,
        }),
      ),
    );

    expect(response.status).toBe(504);
    expectPrivate(response);
    expect(await response.json()).toEqual({
      error: "The AI service timed out before a response was ready.",
    });
  });

  it("returns a distinct no-store cancellation response", async () => {
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

    const pendingResponse = POST(
      request(
        JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
          stream: true,
        }),
        {},
        controller.signal,
      ),
    );
    await vi.waitFor(() => expect(upstream).toHaveBeenCalledOnce());
    const [, init] = upstream.mock.calls[0] as [string, RequestInit];
    expect(init.signal?.aborted).toBe(false);

    controller.abort();
    const response = await pendingResponse;

    expect(response.status).toBe(499);
    expect(init.signal?.aborted).toBe(true);
    expectPrivate(response);
    expect(await response.json()).toEqual({ error: "The model request was cancelled." });
  });
});
