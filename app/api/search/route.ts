// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const WIKI_SEARCH_URL = "https://en.wikipedia.org/w/api.php";
const WIKI_SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/";
const MAX_QUERY = 300;
const UPSTREAM_TIMEOUT_MS = 8_000;
const USER_AGENT =
  "sambai.dev-workbench-search/1.0 (https://www.sambai.dev; contact: sambai.codes@gmail.com)";

const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * MediaWiki snippets arrive as HTML fragments containing escaped entities
 * (e.g. "AT&amp;T"); without decoding they render literally in the UI.
 */
function decodeHtmlEntities(value: string): string {
  // Case-insensitive so uppercase numeric references ("&#X49;") decode too.
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/gi, (match, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) {
      const parsed = Number.parseInt(code.slice(2), 16);
      return Number.isFinite(parsed) && parsed >= 0 && parsed <= 0x10ffff
        ? String.fromCodePoint(parsed)
        : match;
    }
    if (code.startsWith("#")) {
      const parsed = Number.parseInt(code.slice(1), 10);
      return Number.isFinite(parsed) && parsed >= 0 && parsed <= 0x10ffff
        ? String.fromCodePoint(parsed)
        : match;
    }
    return NAMED_HTML_ENTITIES[code] ?? match;
  });
}

function clamp(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  // Strip the <span class="searchmatch"> highlighting Wikipedia injects,
  // then decode entities before slicing so none are cut mid-sequence.
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, "")).slice(0, max);
}

/**
 * Upstream URLs are rendered into anchor hrefs by the client, so only
 * well-formed https links may pass. Anything else (javascript:, data:,
 * relative junk from a drifted upstream) collapses to "".
 */
function safeUrl(value: unknown, max: number): string {
  const candidate = clamp(value, max);
  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function upstreamSignal(request: Request): AbortSignal {
  return AbortSignal.any([request.signal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)]);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = clamp(url.searchParams.get("q"), MAX_QUERY).trim();
  if (!query) {
    return NextResponse.json({ error: "Missing ?q= query." }, { status: 400 });
  }

  try {
    const searchUrl = `${WIKI_SEARCH_URL}?${new URLSearchParams({
      action: "query",
      format: "json",
      list: "search",
      srsearch: query,
      srlimit: "8",
    })}`;
    const searchResponse = await fetch(searchUrl, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: upstreamSignal(request),
    });
    if (!searchResponse.ok) {
      await searchResponse.body?.cancel().catch(() => {});
      return NextResponse.json(
        { error: "Upstream search provider unavailable." },
        { status: 502 },
      );
    }
    const searchData = (await searchResponse.json()) as {
      query?: {
        search?: Array<{ title?: string; snippet?: string }>;
      };
    };
    const hits = (searchData.query?.search ?? []).filter((hit) => hit.title);

    if (!hits.length) {
      return NextResponse.json({
        query,
        heading: "",
        abstract: { text: "", source: "", url: "" },
        answer: "",
        definition: { text: "", url: "" },
        related: [],
      });
    }

    const firstHit = hits[0];
    const title = String(firstHit?.title ?? "");

    let summary: {
      extract?: string;
      content_urls?: { desktop?: { page?: string } };
    } = {};
    const summaryResponse = await fetch(
      `${WIKI_SUMMARY_URL}${encodeURIComponent(title)}?redirect=true`,
      {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: upstreamSignal(request),
      },
    );
    if (summaryResponse.ok) {
      summary = (await summaryResponse.json()) as typeof summary;
    } else {
      // Release the unread body so the pooled socket is not pinned until GC.
      await summaryResponse.body?.cancel().catch(() => {});
    }

    return NextResponse.json({
      query,
      heading: title.slice(0, 200),
      abstract: {
        text: clamp(summary.extract, 1200),
        source: "Wikipedia",
        url: safeUrl(summary.content_urls?.desktop?.page, 500),
      },
      answer: "",
      definition: { text: "", url: "" },
      related: hits.slice(1, 8).map((hit) => ({
        text: clamp(hit.snippet, 400),
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(
          (hit.title ?? "").replace(/ /g, "_"),
        )}`,
      })),
    });
  } catch (caught) {
    // A client disconnect (request.signal) means nobody is listening; only a
    // genuine upstream timeout or failure deserves an error log/status.
    if (caught instanceof Error && caught.name === "AbortError") {
      return new Response(null, { status: 499 });
    }
    if (caught instanceof Error && caught.name === "TimeoutError") {
      console.error("[api/search] upstream timed out");
      return NextResponse.json(
        { error: "The search provider took too long to respond." },
        { status: 504 },
      );
    }
    console.error("[api/search] upstream failure:", caught);
    return NextResponse.json(
      { error: "Could not reach the search provider." },
      { status: 502 },
    );
  }
}
