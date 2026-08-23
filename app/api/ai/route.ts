import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free" as const;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_INPUT_CHARS = 6000;
const MAX_TOKENS = 900;

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
  if (!messages.length || messages[0].role !== "user") return null;
  return messages;
}

function errorMessage(status: number): string {
  if (status === 402)
    return "The free Nemotron tier is exhausted right now. Try again later.";
  if (status === 429) return "Rate limited by the free tier. Give it a moment.";
  if (status >= 500) return "Upstream model provider hiccup. Retry shortly.";
  return "The local AI service refused that request.";
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Local AI is not configured on this deployment." },
      { status: 503 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

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
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // Optional attribution headers recommended by OpenRouter.
        "HTTP-Referer": "https://www.sambai.dev",
        "X-Title": "Sam Bai Workbench Agent",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: MAX_TOKENS,
        stream,
      }),
    });

    if (!upstream.ok || !upstream.body) {
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
        model: MODEL,
        content: content.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim(),
      });
    }

    // Pass the SSE stream straight through; strip <think> blocks client-side.
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the local AI provider." },
      { status: 502 },
    );
  }
}
