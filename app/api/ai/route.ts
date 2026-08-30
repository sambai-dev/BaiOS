// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_INPUT_CHARS = 6000;
const MAX_REQUEST_BYTES = 64_000;
const MAX_TOKENS = 900;
const MAX_STREAM_EVENT_BYTES = 64_000;
const UPSTREAM_TIMEOUT_MS = 55_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const PRIVATE_AI_CACHE_CONTROL = "private, no-store, no-transform";
const THINK_OPEN_TAG = "<think>";
const THINK_CLOSE_TAG = "</think>";

/**
 * Best-effort in-memory sliding-window limiter. The route already requires a
 * same-origin browser context; this bounds scripted hammering that fakes the
 * Origin header so one visitor cannot exhaust the shared upstream quota.
 * Counters are per serverless instance, which is acceptable for mitigation.
 */
const rateLimitHits = new Map<string, number[]>();

/**
 * Keys the limiter on platform-set connection headers rather than anything a
 * browser script can freely choose. Vercel overwrites `x-forwarded-for` from
 * the TCP connection, and `x-vercel-forwarded-for` always carries the IP that
 * connected directly to Vercel even when a fronting proxy rewrites XFF, so it
 * is preferred first.
 */
function rateLimitKey(request: Request): string {
  const headers = request.headers;
  const candidates = [
    headers.get("x-vercel-forwarded-for"),
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for"),
  ];
  for (const candidate of candidates) {
    const first = candidate?.split(",", 1)[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}

function isRateLimited(request: Request): boolean {
  const ip = rateLimitKey(request);
  const now = Date.now();
  const recent = (rateLimitHits.get(ip) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitHits.set(ip, recent);
    return true;
  }
  recent.push(now);
  rateLimitHits.set(ip, recent);
  if (rateLimitHits.size > 1_000) {
    for (const [key, timestamps] of rateLimitHits) {
      if (timestamps.every((timestamp) => now - timestamp >= RATE_LIMIT_WINDOW_MS)) {
        rateLimitHits.delete(key);
      }
    }
  }
  return false;
}

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function sanitizeMessages(input: unknown): ChatMessage[] | null {
  if (!Array.isArray(input)) return null;
  const messages: ChatMessage[] = [];
  for (const raw of input.slice(-10)) {
    if (!raw || typeof raw !== "object") return null;
    const candidate = raw as { role?: unknown; content?: unknown };
    if (
      (candidate.role !== "user" && candidate.role !== "assistant") ||
      typeof candidate.content !== "string"
    ) {
      return null;
    }
    const content = candidate.content.slice(0, MAX_INPUT_CHARS);
    if (!content.trim()) continue;
    messages.push({ role: candidate.role, content });
  }
  if (!messages.length || messages[0]?.role !== "user") return null;
  return messages;
}

function errorMessage(status: number): string {
  if (status === 402)
    return "The model quota is exhausted right now. Try again later.";
  if (status === 429) return "The model is rate limited. Give it a moment.";
  if (status >= 500) return "Upstream model provider hiccup. Retry shortly.";
  return "The AI service refused that request.";
}

function privateJson(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", PRIVATE_AI_CACHE_CONTROL);
  return NextResponse.json(body, { ...init, headers });
}

function providerStreamError(value: unknown): string {
  if (value && typeof value === "object") {
    const candidate = value as { code?: unknown; status?: unknown };
    const status = [candidate.status, candidate.code].find(
      (item): item is number => typeof item === "number" && Number.isInteger(item),
    );
    if (status !== undefined) return errorMessage(status);
  }
  return "The upstream model stream reported an error.";
}

function streamFailureMessage(signal: AbortSignal, caught: unknown): string {
  const reason = signal.reason ?? caught;
  const name = reason instanceof Error ? reason.name : "";
  if (name === "TimeoutError") {
    return "The model stream timed out before completion.";
  }
  if (name === "AbortError") {
    return "The model stream was cancelled before completion.";
  }
  return "The model stream was interrupted before completion.";
}

function partialTagSuffixLength(value: string, tag: string) {
  const normalizedValue = value.toLowerCase();
  const maxLength = Math.min(value.length, tag.length - 1);
  for (let length = maxLength; length > 0; length -= 1) {
    if (tag.startsWith(normalizedValue.slice(-length))) return length;
  }
  return 0;
}

/**
 * Parses complete SSE events instead of individual transport chunks. This
 * normalizes CRLF/LF boundaries, prevents provider metadata from escaping,
 * and turns malformed, errored, or incomplete streams into explicit safe
 * error events rather than an apparently successful EOF.
 */
function redactStreamMetadata(
  stream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const reader = stream.getReader();
  let buffer = "";
  let eventLines: string[] = [];
  let eventBytes = 0;
  let cancelled = false;
  let sawDone = false;
  let sawError = false;
  let contentBuffer = "";
  let insideThinking = false;
  let enqueuedEvents = 0;

  const enqueue = (
    controller: ReadableStreamDefaultController<Uint8Array>,
    value: string,
  ) => {
    controller.enqueue(encoder.encode(value));
    enqueuedEvents += 1;
  };

  const emitContent = (
    controller: ReadableStreamDefaultController<Uint8Array>,
    content: string,
  ) => {
    if (!content || sawDone || sawError) return;
    enqueue(
      controller,
      `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`,
    );
  };

  const consumeContent = (
    content: string,
    controller: ReadableStreamDefaultController<Uint8Array>,
    final = false,
  ) => {
    contentBuffer += content;
    let visible = "";

    while (contentBuffer) {
      if (insideThinking) {
        const closeIndex = contentBuffer.toLowerCase().indexOf(THINK_CLOSE_TAG);
        if (closeIndex >= 0) {
          contentBuffer = contentBuffer.slice(
            closeIndex + THINK_CLOSE_TAG.length,
          );
          insideThinking = false;
          continue;
        }

        if (final) {
          contentBuffer = "";
          break;
        }

        const suffixLength = partialTagSuffixLength(
          contentBuffer,
          THINK_CLOSE_TAG,
        );
        contentBuffer = suffixLength
          ? contentBuffer.slice(-suffixLength)
          : "";
        break;
      }

      const openIndex = contentBuffer.toLowerCase().indexOf(THINK_OPEN_TAG);
      if (openIndex >= 0) {
        visible += contentBuffer.slice(0, openIndex);
        contentBuffer = contentBuffer.slice(openIndex + THINK_OPEN_TAG.length);
        insideThinking = true;
        continue;
      }

      if (final) {
        visible += contentBuffer;
        contentBuffer = "";
        break;
      }

      const suffixLength = partialTagSuffixLength(
        contentBuffer,
        THINK_OPEN_TAG,
      );
      const emitLength = contentBuffer.length - suffixLength;
      visible += contentBuffer.slice(0, emitLength);
      contentBuffer = contentBuffer.slice(emitLength);
      break;
    }

    emitContent(controller, visible);
  };

  const emitError = (
    controller: ReadableStreamDefaultController<Uint8Array>,
    message: string,
  ) => {
    if (sawDone || sawError) return;
    sawError = true;
    contentBuffer = "";
    insideThinking = false;
    enqueue(controller, `data: ${JSON.stringify({ error: message })}\n\n`);
  };

  const emitEvent = (
    controller: ReadableStreamDefaultController<Uint8Array>,
  ) => {
    const lines = eventLines;
    eventLines = [];
    eventBytes = 0;
    if (!lines.length || sawDone || sawError) return;

    const dataLines = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).replace(/^ /, ""));
    if (!dataLines.length) {
      // Preserve the connection-liveness purpose of provider comments without
      // exposing provider-specific processing labels or metadata.
      enqueue(controller, ": keepalive\n\n");
      return;
    }

    const data = dataLines.join("\n").trim();
    if (!data) return;
    if (data === "[DONE]") {
      consumeContent("", controller, true);
      sawDone = true;
      enqueue(controller, "data: [DONE]\n\n");
      return;
    }

    try {
      const parsed = JSON.parse(data) as {
        choices?: unknown;
        error?: unknown;
      };
      if (parsed.error !== undefined) {
        emitError(controller, providerStreamError(parsed.error));
        return;
      }

      const firstChoice = Array.isArray(parsed.choices)
        ? parsed.choices[0]
        : undefined;
      if (!firstChoice || typeof firstChoice !== "object") return;

      const delta = (firstChoice as { delta?: unknown }).delta;
      if (!delta || typeof delta !== "object") return;

      const content = (delta as { content?: unknown }).content;
      if (content === undefined || content === null || content === "") return;
      if (typeof content !== "string") {
        emitError(controller, "The upstream model stream returned invalid text data.");
        return;
      }

      consumeContent(content, controller);
    } catch {
      emitError(controller, "The upstream model stream returned malformed data.");
    }
  };

  const consumeText = (
    text: string,
    controller: ReadableStreamDefaultController<Uint8Array>,
    final = false,
  ) => {
    buffer += text;
    let lineStart = 0;

    for (let index = 0; index < buffer.length; index += 1) {
      const character = buffer[index];
      if (character !== "\n" && character !== "\r") continue;
      if (character === "\r" && index + 1 === buffer.length && !final) break;

      const line = buffer.slice(lineStart, index);
      if (character === "\r" && buffer[index + 1] === "\n") index += 1;
      lineStart = index + 1;

      if (line === "") {
        emitEvent(controller);
      } else {
        eventBytes += encoder.encode(line).byteLength + 1;
        if (eventBytes > MAX_STREAM_EVENT_BYTES) {
          buffer = "";
          eventLines = [];
          emitError(
            controller,
            "The upstream model stream exceeded the event size limit.",
          );
          return;
        }
        eventLines.push(line);
      }
    }

    buffer = buffer.slice(lineStart);
    if (
      eventBytes + encoder.encode(buffer).byteLength >
      MAX_STREAM_EVENT_BYTES
    ) {
      buffer = "";
      eventLines = [];
      emitError(
        controller,
        "The upstream model stream exceeded the event size limit.",
      );
      return;
    }
    if (final) {
      if (buffer) eventLines.push(buffer);
      buffer = "";
      if (eventLines.length) emitEvent(controller);
    }
  };

  let closed = false;
  let released = false;

  const releaseReader = () => {
    if (released) return;
    released = true;
    reader.releaseLock();
  };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (cancelled || closed) return;
      const initialEnqueuedEvents = enqueuedEvents;

      try {
        while (
          !cancelled &&
          !closed &&
          enqueuedEvents === initialEnqueuedEvents
        ) {
          const { done, value } = await reader.read();
          if (done) {
            consumeText(decoder.decode(), controller, true);
            if (!sawDone && !sawError) {
              consumeContent("", controller, true);
              emitError(
                controller,
                "The model stream ended before confirming completion.",
              );
            }
            closed = true;
            controller.close();
            releaseReader();
            return;
          }

          consumeText(decoder.decode(value, { stream: true }), controller);
          if (sawDone || sawError) {
            await reader.cancel().catch(() => {});
            closed = true;
            controller.close();
            releaseReader();
            return;
          }
        }
      } catch (caught) {
        if (cancelled || closed) return;
        try {
          emitError(controller, streamFailureMessage(signal, caught));
          closed = true;
          controller.close();
        } catch {
          closed = true;
          controller.error(caught);
        } finally {
          releaseReader();
        }
      }
    },
    async cancel(reason) {
      cancelled = true;
      closed = true;
      await reader.cancel(reason).catch(() => {});
      releaseReader();
    },
  });
}

function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    if (new URL(origin).origin !== new URL(request.url).origin) return false;
  } catch {
    return false;
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  return !fetchSite || fetchSite === "same-origin";
}

type ReadPayloadResult =
  | { ok: true; value: unknown }
  | { ok: false; message: string; status: number };

/**
 * Streams the body while counting bytes so a chunked request (no
 * Content-Length header) is cut off at MAX_REQUEST_BYTES instead of being
 * buffered into memory first.
 */
async function readBodyWithCap(
  request: Request,
): Promise<{ ok: true; body: string } | { ok: false; oversize: boolean }> {
  const body = request.body;
  if (!body) return { ok: true, body: "" };
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_REQUEST_BYTES) {
        await reader.cancel().catch(() => {});
        return { ok: false, oversize: true };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch {
    return { ok: false, oversize: false };
  }
  return { ok: true, body: text };
}

async function readPayload(request: Request): Promise<ReadPayloadResult> {
  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    return { ok: false, message: "Expected application/json.", status: 415 };
  }

  // Fast path: an honest Content-Length lets us reject before reading.
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return { ok: false, message: "Request body is too large.", status: 413 };
  }

  const read = await readBodyWithCap(request);
  if (!read.ok) {
    return read.oversize
      ? { ok: false, message: "Request body is too large.", status: 413 }
      : { ok: false, message: "Could not read request body.", status: 400 };
  }

  try {
    return { ok: true, value: JSON.parse(read.body) as unknown };
  } catch {
    return { ok: false, message: "Invalid JSON body.", status: 400 };
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return privateJson(
      { error: "This endpoint only accepts same-origin requests." },
      { status: 403 },
    );
  }

  if (isRateLimited(request)) {
    return privateJson(
      { error: "Too many model requests from this visitor. Wait a minute." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL?.trim();
  if (!apiKey || !model) {
    return privateJson(
      { error: "The AI service is not configured on this deployment." },
      { status: 503 },
    );
  }

  const payloadResult = await readPayload(request);
  if (!payloadResult.ok) {
    return privateJson(
      { error: payloadResult.message },
      { status: payloadResult.status },
    );
  }
  const payload = payloadResult.value;

  const messages = sanitizeMessages(
    (payload as { messages?: unknown })?.messages,
  );
  if (!messages) {
    return privateJson(
      { error: "Expected a non-empty user/assistant message array." },
      { status: 400 },
    );
  }

  const stream = (payload as { stream?: unknown })?.stream === true;
  const upstreamSignal = AbortSignal.any([
    request.signal,
    AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  ]);

  try {
    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      // Propagate client aborts (no orphaned billed generations) and bound
      // a wedged upstream so the route cannot hang past maxDuration.
      signal: upstreamSignal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // Optional attribution headers recommended by OpenRouter.
        "HTTP-Referer": "https://www.sambai.dev",
        "X-Title": "Sam Bai Workbench Agent",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: MAX_TOKENS,
        stream,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      // Release the unread error body so the socket returns to the pool,
      // and log the status for production debugging without leaking detail.
      try {
        await upstream.body?.cancel();
      } catch {
        /* body already consumed or unusable */
      }
      console.error(`[api/ai] upstream responded with ${upstream.status}`);
      const detail = errorMessage(upstream.status);
      const retryAfter = upstream.headers.get("retry-after");
      return privateJson(
        { error: detail },
        {
          status: upstream.status,
          headers: retryAfter ? { "Retry-After": retryAfter } : undefined,
        },
      );
    }

    if (!stream) {
      const data = (await upstream.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content =
        data.choices?.[0]?.message?.content ??
        "(empty response from the model)";
      return privateJson({
        content: content.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim(),
      });
    }

    // Preserve text streaming while rebuilding a minimal first-party event
    // contract that removes provider metadata and reasoning blocks.
    return new Response(redactStreamMetadata(upstream.body, upstreamSignal), {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": PRIVATE_AI_CACHE_CONTROL,
      },
    });
  } catch (caught) {
    const reason = upstreamSignal.reason ?? caught;
    const name = reason instanceof Error ? reason.name : "";
    if (name === "TimeoutError") {
      console.error("[api/ai] upstream timed out");
      return privateJson(
        { error: "The AI service timed out before a response was ready." },
        { status: 504 },
      );
    }
    if (name === "AbortError" || request.signal.aborted) {
      return privateJson(
        { error: "The model request was cancelled." },
        { status: 499 },
      );
    }

    console.error("[api/ai] upstream failure:", caught);
    return privateJson(
      { error: "Could not reach the AI service." },
      { status: 502 },
    );
  }
}
