// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

"use client";

import "@/app/styles/search-app.css";

import { useCallback, useEffect, useRef, useState } from "react";
import { playSound } from "../lib/workbench-sound";

type SearchResult = {
  query: string;
  heading: string;
  abstract: { text: string; source: string; url: string };
  answer: string;
  definition: { text: string; url: string };
  related: Array<{ title: string; text: string; url: string }>;
};

type SearchAppProps = {
  onSavedToArchive?: (note: { title: string; body: string }) => boolean;
};

const WIKIPEDIA_HOME_URL = "https://en.wikipedia.org/";
const WIKIPEDIA_LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/";
const WIKIPEDIA_LICENSE_NOTICE =
  "License: Wikipedia text is available under the Creative Commons Attribution-ShareAlike 4.0 International license (CC BY-SA 4.0); article-specific terms may also apply.";

function safeWikipediaUrl(value?: string): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    const isWikipediaHost =
      url.hostname === "wikipedia.org" || url.hostname.endsWith(".wikipedia.org");
    return url.protocol === "https:" && isWikipediaHost ? url.toString() : "";
  } catch {
    return "";
  }
}

function wikipediaSearchUrl(term: string): string {
  return `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(term)}`;
}

export default function SearchApp({ onSavedToArchive }: SearchAppProps = {}) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [savedIndexes, setSavedIndexes] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const searchAbortRef = useRef<AbortController | null>(null);

  // Closing the window mid-request cancels the fetch instead of letting it
  // complete invisibly in the background.
  useEffect(
    () => () => {
      searchAbortRef.current?.abort();
    },
    [],
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
      setStatusMessage("Searching Wikipedia…");
      const controller = new AbortController();
      searchAbortRef.current = controller;
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as SearchResult & {
          error?: string;
        };
        if (!response.ok) throw new Error(data.error ?? "Search failed.");
        if (!data.abstract.text && !data.answer && !data.related.length) {
          throw new Error("No Wikipedia results for that query.");
        }
        setResult(data);
        setStatusMessage(`Wikipedia results loaded for ${data.query}.`);
        playSound("snap");
      } catch (caught) {
        if ((caught as Error).name === "AbortError") return;
        setErrorText((caught as Error).message);
        setStatusMessage("Wikipedia search finished with an error.");
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading],
  );

  const saveToArchive = useCallback(
    (item: { title?: string; text: string; url?: string }, index: number) => {
      playSound("click");
      // The main card passes the -1 sentinel; it is an abstract, not a
      // numbered related link, so label it as one.
      const suffix = index >= 0 ? `note ${index + 1}` : "abstract";
      const title = item.title || `${result?.heading || result?.query || "Search"} · ${suffix}`;
      const sourceUrl =
        safeWikipediaUrl(item.url) ||
        wikipediaSearchUrl(result?.heading || result?.query || "Wikipedia");
      const saved =
        onSavedToArchive?.({
          title,
          body: [
            item.text,
            "",
            "Source: Wikipedia",
            `Source URL: ${sourceUrl}`,
            WIKIPEDIA_LICENSE_NOTICE,
            `License URL: ${WIKIPEDIA_LICENSE_URL}`,
          ].join("\n"),
        }) ?? false;
      if (saved) {
        setSavedIndexes((current) => new Set(current).add(index));
        setStatusMessage(`Saved “${title}” in Archive.`);
      } else {
        setStatusMessage("Archive save is unavailable.");
      }
    },
    [onSavedToArchive, result],
  );

  const primaryText = result
    ? result.answer || result.abstract.text || result.definition.text
    : "";
  const primarySourceUrl = result
    ? safeWikipediaUrl(result.abstract.url || result.definition.url) ||
      wikipediaSearchUrl(result.heading || result.query)
    : "";

  return (
    <div className="search-app">
      <header className="search-header">
        <div>
          <h2>Search Wikipedia.</h2>
          <p>Wikipedia-backed lookup through this site&apos;s server route.</p>
        </div>
      </header>

      <form
        className="search-bar"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          void runSearch(query);
        }}
      >
        <input
          className="search-input"
          name="wikipedia-query"
          type="text"
          value={query}
          maxLength={300}
          placeholder="Search Wikipedia…"
          aria-label="Search Wikipedia"
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit" className="search-btn" disabled={isLoading}>
          {isLoading ? "Searching…" : "Search"}
        </button>
      </form>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </p>

      <div className="search-response" aria-busy={isLoading}>
        {errorText ? (
          <p className="search-error" role="alert">
            {errorText}
          </p>
        ) : null}

        {result ? (
          <div className="search-results">
            {primaryText ? (
              <article className="search-card">
                <span className="search-card-tag">Wikipedia summary</span>
                <h3>{result.heading || result.query}</h3>
                <p>{primaryText}</p>
                <footer className="search-card-foot">
                  <div className="search-source-meta">
                    <span>{result.abstract.source || "Wikipedia"}</span>
                    <a
                      href={primarySourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open on Wikipedia
                    </a>
                  </div>
                  <button
                    type="button"
                    disabled={savedIndexes.has(-1)}
                    data-saved={savedIndexes.has(-1) ? "true" : undefined}
                    onClick={() => {
                      saveToArchive(
                        {
                          text: primaryText,
                          url: primarySourceUrl,
                        },
                        -1,
                      );
                    }}
                  >
                    {savedIndexes.has(-1)
                      ? "Saved in Archive ✓"
                      : "Save to Archive"}
                  </button>
                </footer>
              </article>
            ) : null}

            {result.related.length ? (
              <section className="search-related" aria-labelledby="search-related-title">
                <h4 id="search-related-title" className="search-related-title">
                  Related Wikipedia results
                </h4>
                <div className="search-related-list">
                  {result.related.map((item, index) => {
                    const itemUrl = safeWikipediaUrl(item.url);
                    const itemTitle = item.title.trim() || `Wikipedia result ${index + 2}`;
                    const itemText = item.text.trim() || `Wikipedia result ${index + 2}`;

                    return (
                      <article key={`${index}-${item.url}`} className="search-row">
                        {itemUrl ? (
                          <a
                            className="search-row-link"
                            href={itemUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open ${itemTitle} on Wikipedia in a new tab`}
                          >
                            <strong>{itemTitle}</strong>
                            <span>{itemText}</span>
                          </a>
                        ) : (
                          <p>
                            <strong>{itemTitle}</strong>
                            <span>{itemText}</span>
                          </p>
                        )}
                        <button
                          type="button"
                          disabled={savedIndexes.has(index)}
                          data-saved={savedIndexes.has(index) ? "true" : undefined}
                          onClick={() => saveToArchive({ ...item, url: itemUrl }, index)}
                        >
                          {savedIndexes.has(index) ? "Saved in Archive ✓" : "Save"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <aside className="search-license" aria-label="Wikipedia source and license">
              <p>
                <strong>Source and license.</strong> Results link to their articles on{" "}
                <a href={WIKIPEDIA_HOME_URL} target="_blank" rel="noopener noreferrer">
                  Wikipedia
                </a>
                . Text is available under{" "}
                <a
                  href={WIKIPEDIA_LICENSE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  CC BY-SA 4.0
                </a>
                ; article-specific terms may also apply. Saved notes retain both the source URL
                and this license notice.
              </p>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}
