"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Currency = "usd" | "nzd";

type MarketCoin = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  marketCap: number;
  marketCapRank: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  change24h: number;
  prices24h: number[];
  lastUpdated: string;
};

type MarketPayload = {
  currency: Currency;
  fetchedAt: string;
  sourceUpdatedAt: string;
  stale: boolean;
  coins: MarketCoin[];
};

const currencyLabels: Record<Currency, string> = {
  usd: "USD",
  nzd: "NZD",
};

function formatPrice(value: number, currency: Currency) {
  const maximumFractionDigits = value >= 1_000 ? 0 : value >= 1 ? 2 : 5;
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: currencyLabels[currency],
    minimumFractionDigits: value >= 1_000 ? 0 : 2,
    maximumFractionDigits,
  }).format(value);
}

function formatCompact(value: number, currency: Currency) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: currencyLabels[currency],
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatUpdateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Update time unavailable";
  return new Intl.DateTimeFormat("en-NZ", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function MarketChart({ coin }: { coin: MarketCoin }) {
  const width = 760;
  const height = 250;
  const paddingX = 6;
  const paddingY = 14;
  const values = coin.prices24h;
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const span = Math.max(maximum - minimum, Math.abs(maximum) * 0.001, 1);
  const points = values.map((value, index) => ({
    x: paddingX + (index / Math.max(values.length - 1, 1)) * (width - paddingX * 2),
    y: paddingY + ((maximum - value) / span) * (height - paddingY * 2),
  }));
  const line = points
    .map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L${points.at(-1)?.x ?? width} ${height} L${points[0]?.x ?? 0} ${height} Z`;
  const direction = coin.change24h >= 0 ? "positive" : "negative";

  return (
    <svg
      className="pulse-chart"
      data-direction={direction}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${coin.name} price movement over the last 24 hours, ${
        coin.change24h >= 0 ? "up" : "down"
      } ${Math.abs(coin.change24h).toFixed(2)} percent`}
      preserveAspectRatio="none"
    >
      <g className="pulse-chart-rules" aria-hidden="true">
        <line x1="0" y1="14" x2={width} y2="14" />
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} />
        <line x1="0" y1={height - 14} x2={width} y2={height - 14} />
      </g>
      <path className="pulse-chart-area" d={area} />
      <path className="pulse-chart-line" d={line} />
      <circle
        className="pulse-chart-terminal"
        cx={points.at(-1)?.x ?? width}
        cy={points.at(-1)?.y ?? height / 2}
        r="4"
      />
    </svg>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="pulse-loading" role="status" aria-live="polite">
      <span>{label}</span>
      <div aria-hidden="true" />
    </div>
  );
}

export default function MarketPulseApp() {
  const [currency, setCurrency] = useState<Currency>("usd");
  const [payload, setPayload] = useState<MarketPayload | null>(null);
  const [selectedId, setSelectedId] = useState("bitcoin");
  const [status, setStatus] = useState<"loading" | "ready" | "refreshing" | "error">(
    "loading",
  );
  const [error, setError] = useState("");
  const [loadingLabel, setLoadingLabel] = useState("Connecting to CoinGecko");
  const [requestVersion, setRequestVersion] = useState(0);

  const fetchMarket = useCallback(async (signal: AbortSignal) => {
    setStatus((current) => (current === "ready" ? "refreshing" : "loading"));
    setError("");

    try {
      const response = await fetch(`/api/crypto?currency=${currency}`, {
        cache: "no-store",
        signal,
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message =
          result && typeof result === "object" && "error" in result
            ? String(result.error)
            : "Market data is unavailable right now.";
        throw new Error(message);
      }
      const next = result as MarketPayload;
      if (!Array.isArray(next.coins) || !next.coins.length) {
        throw new Error("CoinGecko returned no market rows.");
      }
      setPayload(next);
      setSelectedId((current) =>
        next.coins.some((coin) => coin.id === current) ? current : next.coins[0].id,
      );
      setStatus("ready");
    } catch (caught) {
      if (signal.aborted) return;
      setStatus("error");
      setError(
        caught instanceof Error
          ? caught.message
          : "Market data is unavailable right now.",
      );
    }
  }, [currency]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchMarket(controller.signal);
    return () => controller.abort();
  }, [fetchMarket, requestVersion]);

  const selectedCoin = useMemo(
    () => payload?.coins.find((coin) => coin.id === selectedId) ?? payload?.coins[0],
    [payload, selectedId],
  );

  const changeCurrency = (nextCurrency: Currency) => {
    if (nextCurrency === currency) return;
    setCurrency(nextCurrency);
    setLoadingLabel(`Switching to ${currencyLabels[nextCurrency]}`);
    setStatus("loading");
    setPayload(null);
  };

  return (
    <div className="pulse-app">
      <header className="pulse-header">
        <div>
          <h2>Market pulse.</h2>
          <p>Twenty-four hours across eight high-liquidity crypto assets.</p>
        </div>
        <div className="pulse-controls">
          <div className="pulse-currency" role="group" aria-label="Display currency">
            {(Object.keys(currencyLabels) as Currency[]).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={currency === item}
                onClick={() => changeCurrency(item)}
              >
                {currencyLabels[item]}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="pulse-refresh"
            onClick={() => setRequestVersion((current) => current + 1)}
            disabled={status === "loading" || status === "refreshing"}
          >
            {status === "refreshing" ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </header>

      {status === "loading" && !payload ? (
        <LoadingState label={loadingLabel} />
      ) : status === "error" && !payload ? (
        <div className="pulse-error" role="alert">
          <strong>Couldn’t reach the market.</strong>
          <p>{error}</p>
          <button type="button" onClick={() => setRequestVersion((current) => current + 1)}>
            Try again
          </button>
        </div>
      ) : selectedCoin && payload ? (
        <div className="pulse-workspace" aria-busy={status === "refreshing"}>
          <section className="pulse-stage" aria-label={`${selectedCoin.name} market detail`}>
            <div className="pulse-quote">
              <div>
                <span className="pulse-asset-mark" aria-hidden="true">
                  {selectedCoin.symbol.slice(0, 2)}
                </span>
                <span>
                  <strong>{selectedCoin.name}</strong>
                  <small>
                    {selectedCoin.symbol} · Rank {selectedCoin.marketCapRank}
                  </small>
                </span>
              </div>
              <div className="pulse-price">
                <strong>{formatPrice(selectedCoin.price, currency)}</strong>
                <span data-direction={selectedCoin.change24h >= 0 ? "positive" : "negative"}>
                  {selectedCoin.change24h >= 0 ? "+" : ""}
                  {selectedCoin.change24h.toFixed(2)}%
                </span>
              </div>
            </div>

            <MarketChart coin={selectedCoin} />

            <div className="pulse-chart-axis" aria-hidden="true">
              <span>24h ago</span>
              <span>Now</span>
            </div>
            <dl className="pulse-stats">
              <div><dt>24h high</dt><dd>{formatPrice(selectedCoin.high24h, currency)}</dd></div>
              <div><dt>24h low</dt><dd>{formatPrice(selectedCoin.low24h, currency)}</dd></div>
              <div><dt>Market cap</dt><dd>{formatCompact(selectedCoin.marketCap, currency)}</dd></div>
              <div><dt>24h volume</dt><dd>{formatCompact(selectedCoin.volume24h, currency)}</dd></div>
            </dl>
          </section>

          <aside className="pulse-market" aria-label="Tracked crypto assets">
            <div className="pulse-market-head" aria-hidden="true">
              <span>Asset</span><span>Price / 24h</span>
            </div>
            <div className="pulse-market-rows">
              {payload.coins.map((coin) => (
                <button
                  key={coin.id}
                  type="button"
                  aria-pressed={coin.id === selectedCoin.id}
                  onClick={() => setSelectedId(coin.id)}
                >
                  <span className="pulse-rank">{coin.marketCapRank.toString().padStart(2, "0")}</span>
                  <span className="pulse-market-name">
                    <strong>{coin.symbol}</strong>
                    <small>{coin.name}</small>
                  </span>
                  <span className="pulse-market-price">
                    <strong>{formatPrice(coin.price, currency)}</strong>
                    <small data-direction={coin.change24h >= 0 ? "positive" : "negative"}>
                      {coin.change24h >= 0 ? "+" : ""}{coin.change24h.toFixed(2)}%
                    </small>
                  </span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      ) : (
        <LoadingState label={loadingLabel} />
      )}

      <footer className="pulse-footer" aria-live="polite">
        <span>
          {payload?.stale ? "Cached market snapshot" : "CoinGecko market data"}
          {payload ? ` · ${formatUpdateTime(payload.sourceUpdatedAt)}` : ""}
        </span>
        <a href="https://www.coingecko.com/" target="_blank" rel="noreferrer">
          Data by CoinGecko
        </a>
      </footer>
    </div>
  );
}
