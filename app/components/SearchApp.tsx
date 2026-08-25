// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

"use client";

import { useCallback, useState } from "react";
import { playSound } from "../lib/workbench-sound";

type SearchResult = {
  query: string;
  heading: string;
  abstract: { text: string; source: string; url: string };
  answer: string;
  definition: { text: string; url: string };
  related: Array<{ text: string; url: string }>;
};

export default function SearchApp({ onSavedToArchive }: { onSavedToArchive?: (note: { title: string; body: string }) => void } = {}) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [savedIndexes, setSavedIndexes] = useState<ReadonlySet<number>>(
    () => new Set(),
  );

  const runSearch = useCallback(
    async (term: string) => {
      const trimmed = term.trim();
      if (!trimmed || isLoading) return;
      playSound("chime");
      setQuery(trimmed);
      setIsLoading(true);
      setErrorText(null);
      setResult(null);
      setSavedIndexes(new Set());
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}`,
        );
        const data = (await response.json()) as SearchResult & {
          error?: string;
        };
        if (!response.ok) throw new Error(data.error ?? "Search failed.");
        if (!data.abstract.text && !data.answer && !data.related.length) {
          throw new Error("No instant results for that query.");
        }
        setResult(data);
        playSound("snap");
      } catch (caught) {
        setErrorText((caught as Error).message);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading],
  );

  const saveToArchive = useCallback(
    (item: { text: string; url?: string }, index: number) => {
      playSound("click");
      const title = `${result?.heading || result?.query || "Search"} · note ${
        index + 1
      }`;
      onSavedToArchive?.({
        title,
        body: item.url ? `${item.text}\n\n${item.url}` : item.text,
      });
      setSavedIndexes((current) => new Set(current).add(index));
    },
    [onSavedToArchive, result],
  );

  return (
    <div className="search-app">
      <header className="search-header">
        <div>
          <h2>Search.</h2>
          <p>Instant answers via this deployment&apos;s local search route.</p>
        </div>
      </header>

      <form
        className="search-bar"
        onSubmit={(event) => {
          event.preventDefault();
          void runSearch(query);
        }}
      >
        <input
          className="search-input"
          type="text"
          value={query}
          maxLength={300}
          placeholder="Ask anything… e.g. wellington new zealand"
          aria-label="Search query"
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit" className="search-btn" disabled={isLoading}>
          {isLoading ? "Searching…" : "Search"}
        </button>
      </form>

      {errorText ? <p className="search-error">{errorText}</p> : null}

      {result ? (
        <div className="search-results">
          {(result.abstract.text || result.answer || result.definition.text) && (
            <article className="search-card">
              <span className="search-card-tag">
                {result.answer
                  ? "Instant Answer"
                  : result.definition.text
                    ? "Definition"
                    : "Abstract"}
              </span>
              <h3>{result.heading || result.query}</h3>
              <p>
                {result.answer ||
                  result.abstract.text ||
                  result.definition.text}
              </p>
              <footer className="search-card-foot">
                {result.abstract.source ? (
                  <span>{result.abstract.source}</span>
                ) : null}
                {result.abstract.url || result.definition.url ? (
                  <a
                    href={result.abstract.url || result.definition.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open source ↗
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    saveToArchive(
                      {
                        text:
                          result.answer ||
                          result.abstract.text ||
                          result.definition.text,
                        url: result.abstract.url || result.definition.url,
                      },
                      -1,
                    )
                  }
                >
                  {savedIndexes.has(-1) ? "Saved ✓" : "Save to Archive"}
                </button>
              </footer>
            </article>
          )}

          {result.related.length ? (
            <>
              <h4 className="search-related-title">Related</h4>
              {result.related.map((item, index) => (
                <div key={`${index}-${item.url}`} className="search-row">
                  <p>{item.text}</p>
                  <button
                    type="button"
                    onClick={() => saveToArchive(item, index)}
                  >
                    {savedIndexes.has(index) ? "Saved ✓" : "Save"}
                  </button>
                </div>
              ))}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
