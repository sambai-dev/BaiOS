// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { isIP } from "node:net";

import {
  answerForSelection,
  isPlainRecord,
  looksLikeSensitiveInput,
  PRIVACY_REMINDER,
  SCOPE_ANSWER,
  TOPIC_SELECTOR_FORMAT,
  TOPIC_SELECTOR_PROMPT,
} from "../../lib/portfolio-chat";

export const runtime = "nodejs";
export const maxDuration = 60;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_REQUEST_BYTES = 32_000;
const MAX_UPSTREAM_BYTES = 32_000;
const MAX_INPUT_CHARS = 2_000;
const MAX_MESSAGES = 9;
const REQUEST_TIMEOUT_MS = 55_000;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 12;
const RATE_MAX_KEYS = 1_000;
const MAX_CONCURRENT_REQUESTS = 4;
const PRIVATE_CACHE_CONTROL = "private, no-store, no-transform";

/**
 * Best-effort per-instance abuse controls, not a distributed quota. Production
 * needs platform-level limits for a shared quota across instances. Connection
 * headers are only trustworthy behind a proxy that replaces visitor values.
 * The maps contain short-lived IPs and timestamps, never prompts or answers.
 */
const rateHits = new Map<string, number[]>();
let activeRequests = 0;

function requestKey(request: Request): string {
  for (const name of ["x-vercel-forwarded-for", "x-real-ip", "x-forwarded-for"]) {
    const first = request.headers.get(name)?.split(",", 1)[0]?.trim();
    if (first && first.length <= 45 && isIP(first)) return first;
  }
  return "unknown";
}

function isRateLimited(request: Request): boolean {
  const now = Date.now();
  const key = requestKey(request);
  // Remove expired entries before admitting a new key. If all slots are still
  // active, reject the new key instead of growing memory or evicting limits.
  for (const [storedKey, hits] of rateHits) {
    const recent = hits.filter((hit) => now - hit < RATE_WINDOW_MS);
    if (recent.length) rateHits.set(storedKey, recent);
    else rateHits.delete(storedKey);
  }
  const recent = rateHits.get(key) ?? [];
  if (recent.length >= RATE_MAX_REQUESTS) return true;
  if (!rateHits.has(key) && rateHits.size >= RATE_MAX_KEYS) return true;
  rateHits.set(key, [...recent, now]);
  return false;
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!origin || (fetchSite !== null && fetchSite !== "same-origin")) return false;
  const requestUrl = new URL(request.url);
  if (origin === requestUrl.origin) return true;
  // Local Next servers can normalize 127.0.0.1 to localhost in request.url.
  // Only accept that alias when the actual Host matches the browser's origin,
  // with identical protocol and port. Vercel always keeps exact-origin checks.
  if (process.env.VERCEL) return false;
  const isLoopback = (hostname: string) => hostname === "localhost" || hostname === "127.0.0.1";
  if (!isLoopback(requestUrl.hostname)) return false;
  try {
    const originUrl = new URL(origin);
    return (
      originUrl.origin === origin &&
      isLoopback(originUrl.hostname) &&
      originUrl.protocol === requestUrl.protocol &&
      originUrl.port === requestUrl.port &&
      request.headers.get("host") === originUrl.host
    );
  } catch {
    return false;
  }
}

function privateJson(body: unknown, status = 200, extraHeaders?: HeadersInit) {
  const headers = new Headers(extraHeaders);
  headers.set("Cache-Control", PRIVATE_CACHE_CONTROL);
  headers.set("X-Content-Type-Options", "nosniff");
  return Response.json(body, { status, headers });
}

function answerResponse(content: string, stream: boolean): Response {
  if (!stream) return privateJson({ content });
  // Classification is non-streaming. Only the reviewed answer is transported
  // as SSE to retain the client contract; there is no simulated typing.
  const event = JSON.stringify({ choices: [{ delta: { content } }] });
  return new Response(`data: ${event}\n\ndata: [DONE]\n\n`, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": PRIVATE_CACHE_CONTROL,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

class BodyLimitError extends Error {}

/** Bound bytes while reading and cancel stalled bodies on timeout or abort. */
async function readTextWithCap(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
  signal: AbortSignal,
): Promise<string> {
  signal.throwIfAborted();
  if (!body) throw new Error("Missing body");
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  let rejectAbort: (reason: unknown) => void = () => {};
  const aborted = new Promise<never>((_, reject) => { rejectAbort = reject; });
  const onAbort = () => {
    // A stream's cancel callback can itself stall, so never await it here.
    void reader.cancel().catch(() => {});
    rejectAbort(signal.reason);
  };
  signal.addEventListener("abort", onAbort, { once: true });
  if (signal.aborted) onAbort();
  try {
    for (;;) {
      const { done, value } = await Promise.race([reader.read(), aborted]);
      signal.throwIfAborted();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) {
        void reader.cancel().catch(() => {});
        throw new BodyLimitError();
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    signal.removeEventListener("abort", onAbort);
    reader.releaseLock();
  }
}

type ChatPayload = { question: string; stream: boolean };

function parsePayload(value: unknown): ChatPayload | null {
  if (!isPlainRecord(value)) return null;
  if (Object.keys(value).some((key) => key !== "messages" && key !== "stream")) return null;
  if (value.stream !== undefined && typeof value.stream !== "boolean") return null;
  if (
    !Array.isArray(value.messages) ||
    value.messages.length < 1 ||
    value.messages.length > MAX_MESSAGES ||
    value.messages.length % 2 === 0
  ) return null;
  let question = "";
  for (const [index, valueMessage] of value.messages.entries()) {
    if (!isPlainRecord(valueMessage)) return null;
    if (Object.keys(valueMessage).some((key) => key !== "role" && key !== "content")) return null;
    if (valueMessage.role !== (index % 2 === 0 ? "user" : "assistant")) return null;
    if (typeof valueMessage.content !== "string" || valueMessage.content.length > MAX_INPUT_CHARS) return null;
    const content = valueMessage.content.trim();
    if (!content) return null;
    question = content;
  }
  return { question, stream: value.stream === true };
}

function upstreamAnswer(value: unknown): string {
  if (!isPlainRecord(value) || !Array.isArray(value.choices) || value.choices.length !== 1) return SCOPE_ANSWER;
  const choice = value.choices[0];
  if (!isPlainRecord(choice) || choice.finish_reason !== "stop" || !isPlainRecord(choice.message)) return SCOPE_ANSWER;
  const message = choice.message;
  // Nothing except a completed content selection is accepted. Never execute
  // or forward a provider's function calls, tool calls, reasoning, or metadata.
  const hasToolCalls = message.tool_calls != null && (!Array.isArray(message.tool_calls) || message.tool_calls.length > 0);
  if (hasToolCalls || message.function_call != null || message.refusal) return SCOPE_ANSWER;
  return answerForSelection(message.content);
}

export async function POST(request: Request): Promise<Response> {
  if (request.method !== "POST") return privateJson({ error: "Use POST for chat questions." }, 405, { Allow: "POST" });
  if (!isSameOrigin(request)) return privateJson({ error: "This endpoint only accepts same-origin requests." }, 403);
  if (isRateLimited(request)) return privateJson({ error: "Too many questions. Please wait a minute." }, 429, { "Retry-After": "60" });
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") return privateJson({ error: "Expected application/json." }, 415);
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null && !/^\d+$/.test(declaredLength)) return privateJson({ error: "Invalid request length." }, 400);
  if (declaredLength !== null && Number(declaredLength) > MAX_REQUEST_BYTES) return privateJson({ error: "Request body is too large." }, 413);
  if (activeRequests >= MAX_CONCURRENT_REQUESTS) return privateJson({ error: "Chat is busy. Please try again shortly." }, 429, { "Retry-After": "10" });

  activeRequests += 1;
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]);
  try {
    let value: unknown;
    try {
      value = JSON.parse(await readTextWithCap(request.body, MAX_REQUEST_BYTES, signal));
    } catch (error) {
      if (signal.aborted) throw error;
      return error instanceof BodyLimitError
        ? privateJson({ error: "Request body is too large." }, 413)
        : privateJson({ error: "Invalid JSON request body." }, 400);
    }
    const payload = parsePayload(value);
    if (!payload) return privateJson({ error: "Send 1 to 9 alternating user and assistant messages, ending with a question. Each message must contain 1 to 2000 characters." }, 400);
    const latestQuestion = payload.question;
    if (looksLikeSensitiveInput(latestQuestion)) return answerResponse(PRIVACY_REMINDER, payload.stream);

    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    const model = process.env.OPENROUTER_MODEL?.trim();
    // Fail closed if an environment change points at a paid model or router.
    if (!apiKey || !model || !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+:free$/.test(model)) {
      return privateJson({ error: "Chat is unavailable right now. You can still explore All projects or contact Sam directly." }, 503);
    }

    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      redirect: "error",
      cache: "no-store",
      signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://www.sambai.dev",
        "X-OpenRouter-Title": "Sam Bai Portfolio Chat",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: TOPIC_SELECTOR_PROMPT },
          // Earlier visitor/assistant messages are never trusted or forwarded.
          { role: "user", content: latestQuestion },
        ],
        response_format: TOPIC_SELECTOR_FORMAT,
        reasoning: { enabled: false },
        temperature: 0,
        max_tokens: 512,
        stream: false,
        provider: { max_price: { prompt: 0, completion: 0 }, allow_fallbacks: false },
      }),
    });
    signal.throwIfAborted();
    if (!upstream.ok) {
      void upstream.body?.cancel().catch(() => {});
      return upstream.status === 429
        ? privateJson({ error: "The chat provider is busy. Please try again shortly." }, 429, { "Retry-After": "60" })
        : privateJson({ error: "Chat is unavailable right now. Please try again later." }, 502);
    }
    const upstreamType = upstream.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    const upstreamLength = Number(upstream.headers.get("content-length"));
    if (upstreamType !== "application/json" || upstreamLength > MAX_UPSTREAM_BYTES) {
      void upstream.body?.cancel().catch(() => {});
      return privateJson({ error: "The chat provider returned an unusable response." }, 502);
    }
    const raw = await readTextWithCap(upstream.body, MAX_UPSTREAM_BYTES, signal);
    let selection: unknown;
    try {
      selection = JSON.parse(raw);
    } catch {
      return answerResponse(SCOPE_ANSWER, payload.stream);
    }
    signal.throwIfAborted();
    // OpenRouter can report a provider failure inside an HTTP 200 envelope.
    // Report service unavailability, not a successful out-of-scope answer.
    if (isPlainRecord(selection) && Object.hasOwn(selection, "error")) {
      const error = selection.error;
      const limited = isPlainRecord(error) && (error.code === 429 || error.status === 429);
      return limited
        ? privateJson({ error: "The chat provider is busy. Please try again shortly." }, 429, { "Retry-After": "60" })
        : privateJson({ error: "Chat is unavailable right now. Please try again later." }, 502);
    }
    return answerResponse(upstreamAnswer(selection), payload.stream);
  } catch {
    // No caught objects, prompts, provider bodies, or credentials enter logs.
    if (request.signal.aborted) return privateJson({ error: "The question was cancelled." }, 499);
    if (signal.aborted) return privateJson({ error: "Chat took too long to respond. Please try again." }, 504);
    return privateJson({ error: "Could not reach the chat provider. Please try again later." }, 502);
  } finally {
    activeRequests -= 1;
  }
}
