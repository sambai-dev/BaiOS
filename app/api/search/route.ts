// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const WIKI_SEARCH_URL = "https://en.wikipedia.org/w/api.php";
const WIKI_SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/";
const MAX_QUERY = 300;
const USER_AGENT =
  "sambai.dev-workbench-search/1.0 (https://www.sambai.dev; contact: sambai.codes@gmail.com)";

function clamp(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  // Strip the <span class="searchmatch"> highlighting Wikipedia injects.
  return value.replace(/<[^>]+>/g, "").slice(0, max);
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
    });
    if (!searchResponse.ok) {
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

    const title = String(hits[0].title ?? "");

    let summary: {
      extract?: string;
      content_urls?: { desktop?: { page?: string } };
    } = {};
    const summaryResponse = await fetch(
      `${WIKI_SUMMARY_URL}${encodeURIComponent(title)}?redirect=true`,
      {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      },
    );
    if (summaryResponse.ok) {
      summary = (await summaryResponse.json()) as typeof summary;
    }

    return NextResponse.json({
      query,
      heading: title.slice(0, 200),
      abstract: {
        text: clamp(summary.extract, 1200),
        source: "Wikipedia",
        url: clamp(summary.content_urls?.desktop?.page, 500),
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
  } catch {
    return NextResponse.json(
      { error: "Could not reach the search provider." },
      { status: 502 },
    );
  }
}
