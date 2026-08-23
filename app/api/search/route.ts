import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const INSTANT_ANSWER_URL = "https://api.duckduckgo.com/";
const MAX_QUERY = 300;

function clamp(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = clamp(url.searchParams.get("q"), MAX_QUERY).trim();
  if (!query) {
    return NextResponse.json({ error: "Missing ?q= query." }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `${INSTANT_ANSWER_URL}?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { headers: { Accept: "application/json" } },
    );
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Upstream search provider unavailable." },
        { status: 502 },
      );
    }

    const data = (await upstream.json()) as {
      AbstractText?: string;
      AbstractSource?: string;
      AbstractURL?: string;
      Heading?: string;
      Answer?: string;
      Definition?: string;
      DefinitionURL?: string;
      RelatedTopics?: Array<{
        Text?: string;
        FirstURL?: string;
        Topics?: Array<{ Text?: string; FirstURL?: string }>;
      }>;
    };

    const related = (data.RelatedTopics ?? [])
      .flatMap((topic) =>
        topic.Topics?.length
          ? topic.Topics.map((nested) => ({
              text: clamp(nested.Text, 400),
              url: clamp(nested.FirstURL, 500),
            }))
          : [
              {
                text: clamp(topic.Text, 400),
                url: clamp(topic.FirstURL, 500),
              },
            ],
      )
      .filter((item) => item.text)
      .slice(0, 8);

    return NextResponse.json({
      query,
      heading: clamp(data.Heading, 200),
      abstract: {
        text: clamp(data.AbstractText, 1200),
        source: clamp(data.AbstractSource, 100),
        url: clamp(data.AbstractURL, 500),
      },
      answer: clamp(data.Answer, 400),
      definition: {
        text: clamp(data.Definition, 800),
        url: clamp(data.DefinitionURL, 500),
      },
      related,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the search provider." },
      { status: 502 },
    );
  }
}
