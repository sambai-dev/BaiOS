// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_INPUT_CHARS = 6000;
const MAX_REQUEST_BYTES = 64_000;
const MAX_TOKENS = 900;
const UPSTREAM_TIMEOUT_MS = 55_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 12;

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

function redactStreamMetadata(stream: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  function redactLine(line: string): string {
    if (!line.startsWith("data:")) return line;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") return line;

    try {
      const parsed = JSON.parse(data) as {
        choices?: unknown;
        usage?: unknown;
      };
      return `data: ${JSON.stringify({
        ...(parsed.choices !== undefined ? { choices: parsed.choices } : {}),
        ...(parsed.usage !== undefined ? { usage: parsed.usage } : {}),
      })}`;
    } catch {
      return "data: {}";
    }
  }

  return stream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          controller.enqueue(encoder.encode(`${redactLine(line)}\n`));
        }
      },
      flush(controller) {
        buffer += decoder.decode();
        if (buffer) controller.enqueue(encoder.encode(redactLine(buffer)));
      },
    }),
  );
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
    return NextResponse.json(
      { error: "This endpoint only accepts same-origin requests." },
      { status: 403 },
    );
  }

  if (isRateLimited(request)) {
    return NextResponse.json(
      { error: "Too many model requests from this visitor. Wait a minute." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL?.trim();
  if (!apiKey || !model) {
    return NextResponse.json(
      { error: "The AI service is not configured on this deployment." },
      { status: 503 },
    );
  }

  const payloadResult = await readPayload(request);
  if (!payloadResult.ok) {
    return NextResponse.json(
      { error: payloadResult.message },
      { status: payloadResult.status },
    );
  }
  const payload = payloadResult.value;

  const messages = sanitizeMessages(
    (payload as { messages?: unknown })?.messages,
  );
  if (!messages) {
    return NextResponse.json(
      { error: "Expected a non-empty user/assistant message array." },
      { status: 400 },
    );
  }

  const stream = (payload as { stream?: unknown })?.stream === true;

  try {
    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      // Propagate client aborts (no orphaned billed generations) and bound
      // a wedged upstream so the route cannot hang past maxDuration.
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)]),
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
      return NextResponse.json({ error: detail }, { status: upstream.status });
    }

    if (!stream) {
      const data = (await upstream.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content =
        data.choices?.[0]?.message?.content ??
        "(empty response from the model)";
      return NextResponse.json({
        content: content.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim(),
      });
    }

    // Preserve token streaming while removing provider/model metadata. The
    // client strips model reasoning blocks from the accumulated text.
    return new Response(redactStreamMetadata(upstream.body), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
      },
    });
  } catch (caught) {
    if ((caught as Error).name === "TimeoutError") {
      console.error("[api/ai] upstream timed out");
    } else {
      console.error("[api/ai] upstream failure:", caught);
    }
    return NextResponse.json(
      { error: "Could not reach the AI service." },
      { status: 502 },
    );
  }
}
