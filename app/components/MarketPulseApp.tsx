// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

"use client";

import "@/app/styles/market-pulse-app.css";
import { useEffect, useId, useMemo, useState } from "react";
import { exponentialMovingAverage, priceDomain } from "@/app/lib/market-indicators";
import {
  MARKET_COIN_IDS, type MarketCoinId, type MarketCurrency, type MarketHistoryDays,
  type MarketHistoryPayload, type MarketSentimentPayload,
} from "@/app/lib/market-data";

type MarketCoin = {
  id: string; symbol: string; name: string; price: number; marketCap: number;
  marketCapRank: number; volume24h: number; high24h: number; low24h: number;
  change24h: number; prices24h: number[]; lastUpdated: string;
};
type MarketPayload = {
  currency: MarketCurrency; fetchedAt: string; sourceUpdatedAt: string;
  stale: boolean; coins: MarketCoin[];
};
type Resource<T> = { url: string; data: T | null; loading: boolean; error: string };
const assets: Record<MarketCoinId, { name: string; symbol: string }> = {
  bitcoin: { name: "Bitcoin", symbol: "BTC" }, ethereum: { name: "Ethereum", symbol: "ETH" },
  solana: { name: "Solana", symbol: "SOL" }, binancecoin: { name: "BNB", symbol: "BNB" },
  ripple: { name: "XRP", symbol: "XRP" }, cardano: { name: "Cardano", symbol: "ADA" },
  dogecoin: { name: "Dogecoin", symbol: "DOGE" }, "avalanche-2": { name: "Avalanche", symbol: "AVAX" },
};

function formatPrice(value: number, currency: MarketCurrency, compact = false) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency", currency: currency.toUpperCase(),
    ...(compact ? { notation: "compact", maximumFractionDigits: 1 } : {
      minimumFractionDigits: value >= 1_000 ? 0 : 2,
      maximumFractionDigits: value >= 1_000 ? 0 : value >= 1 ? 2 : 5,
    }),
  }).format(value);
}
function formatDate(value: string | number, withTime = true) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat("en-NZ", {
    day: "numeric", month: "short", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "UTC",
  }).format(date);
}
function formatChange(value: number) { return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`; }

/** Abort hidden/unmounted requests and keep a bounded deadline on older browsers too. */
function useMarketResource<T>(url: string, active: boolean, version: number) {
  const [resource, setResource] = useState<Resource<T>>({ url, data: null, loading: true, error: "" });
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    let timedOut = false;
    const deadline = window.setTimeout(() => { timedOut = true; controller.abort(); }, 12_000);
    setResource((current) => ({ url, data: current.url === url ? current.data : null, loading: true, error: "" }));
    async function load() {
      try {
        const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
        const result: unknown = await response.json();
        if (!response.ok) {
          const message = result && typeof result === "object" && "error" in result
            ? String(result.error) : "The provider is temporarily unavailable.";
          throw new Error(message);
        }
        if (!result || typeof result !== "object") throw new Error("The provider returned unreadable data.");
        if (!controller.signal.aborted) setResource({ url, data: result as T, loading: false, error: "" });
      } catch (error) {
        if (controller.signal.aborted && !timedOut) return;
        setResource((current) => ({
          url, data: current.url === url ? current.data : null, loading: false,
          error: timedOut ? "The request took too long. Try refreshing." : error instanceof Error ? error.message : "Data is temporarily unavailable.",
        }));
      } finally { window.clearTimeout(deadline); }
    }
    void load();
    return () => { window.clearTimeout(deadline); controller.abort(); };
  }, [url, active, version]);
  return resource.url === url ? resource : { url, data: null, loading: true, error: "" };
}

function DataMessage({ loading, error, label, onRetry }: { loading?: boolean; error?: string; label: string; onRetry: () => void }) {
  return <div className="pulse-empty" role={error ? "alert" : "status"}>
    <span className="pulse-empty-mark" aria-hidden="true">{loading ? "···" : "—"}</span>
    <strong>{loading ? `Loading ${label.toLowerCase()}` : `${label} unavailable`}</strong>
    <p>{loading ? "Requesting the latest provider snapshot." : error}</p>
    {!loading && <button type="button" onClick={onRetry}>Try again</button>}
  </div>;
}

function PriceChart({ history, currency, show20, show50 }: {
  history: MarketHistoryPayload; currency: MarketCurrency; show20: boolean; show50: boolean;
}) {
  const labelId = useId();
  const [inspectedIndex, setInspectedIndex] = useState<number | null>(null);
  const chart = useMemo(() => {
    const values = history.points.map((point) => point.price);
    const ema20 = exponentialMovingAverage(values, 20);
    const ema50 = exponentialMovingAverage(values, 50);
    const domain = priceDomain(values);
    const first = history.points[0]!;
    const last = history.points[history.points.length - 1]!;
    const duration = Math.max(1, last.timestamp - first.timestamp);
    const x = (index: number) => ((history.points[index]!.timestamp - first.timestamp) / duration) * 1_000;
    const y = (value: number) => 12 + (1 - (value - domain.minimum) / (domain.maximum - domain.minimum)) * 276;
    const path = (series: Array<number | null>) => {
      let connected = false;
      return series.map((value, index) => {
        if (value === null) { connected = false; return ""; }
        const command = connected ? "L" : "M";
        connected = true;
        return `${command}${x(index).toFixed(2)} ${y(value).toFixed(2)}`;
      }).join(" ");
    };
    return { ema20, ema50, domain, first, last, x, y, line: path(values), line20: path(ema20), line50: path(ema50) };
  }, [history]);
  const index = Math.min(inspectedIndex ?? history.points.length - 1, history.points.length - 1);
  const sample = history.points[index]!;
  const average20 = chart.ema20[index];
  const average50 = chart.ema50[index];
  const yValues = [chart.domain.maximum, (chart.domain.maximum + chart.domain.minimum) / 2, chart.domain.minimum];
  return <div className="pulse-chart-area">
    <div className="pulse-inspection" aria-live="off">
      <span>{formatDate(sample.timestamp)} <small>UTC</small></span>
      <strong>{formatPrice(sample.price, currency)}</strong>
    </div>
    <div className="pulse-plot-shell">
      <svg className="pulse-plot" viewBox="0 0 1000 300" preserveAspectRatio="none" role="img"
        aria-label={`${assets[history.coin].name} price history over ${history.days} ${history.days === 1 ? "day" : "days"}${show20 ? ", 20-period EMA" : ""}${show50 ? ", 50-period EMA" : ""}`}
        onPointerMove={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const progress = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
          const time = chart.first.timestamp + progress * (chart.last.timestamp - chart.first.timestamp);
          // Binary search uses actual observation times, including irregular provider gaps.
          let low = 0; let high = history.points.length - 1;
          while (low < high) { const mid = Math.floor((low + high) / 2); if (history.points[mid]!.timestamp < time) low = mid + 1; else high = mid; }
          const before = Math.max(0, low - 1);
          setInspectedIndex(Math.abs(history.points[before]!.timestamp - time) < Math.abs(history.points[low]!.timestamp - time) ? before : low);
        }}>
        <g className="pulse-grid" aria-hidden="true">
          {[12, 150, 288].map((y) => <line key={y} x1="0" x2="1000" y1={y} y2={y} />)}
          {[0, 250, 500, 750, 1000].map((x) => <line key={x} x1={x} x2={x} y1="0" y2="300" />)}
        </g>
        <path className="pulse-price-fill" fill="#7e82ff" opacity="0.045" d={`${chart.line} L1000 300 L0 300 Z`} />
        {show50 && <path className="pulse-ema50" d={chart.line50} fill="none" stroke="#f2c47b" />}
        {show20 && <path className="pulse-ema20" d={chart.line20} fill="none" stroke="#a6e3b3" />}
        <path className="pulse-price-line" d={chart.line} fill="none" stroke="#9b9eff" />
        <line className="pulse-crosshair" x1={chart.x(index)} x2={chart.x(index)} y1="0" y2="300" />
        <circle className="pulse-point" cx={chart.x(index)} cy={chart.y(sample.price)} r="4.5" />
      </svg>
      <div className="pulse-y-axis" aria-hidden="true">{yValues.map((value, item) => <span key={item}>{formatPrice(value, currency, Math.abs(value) >= 10_000)}</span>)}</div>
    </div>
    <div className="pulse-x-axis" aria-hidden="true"><span>{formatDate(chart.first.timestamp, history.days === 1)}</span><span>{formatDate(chart.last.timestamp, history.days === 1)}</span></div>
    <div className="pulse-scrubber">
      <label id={labelId} htmlFor={`${labelId}-range`}>Inspect history</label>
      <input id={`${labelId}-range`} aria-labelledby={labelId} type="range" min="0" max={history.points.length - 1} step="1" value={index}
        aria-valuetext={`${formatDate(sample.timestamp)} UTC, ${formatPrice(sample.price, currency)}`}
        onChange={(event) => setInspectedIndex(Number(event.target.value))} />
      <button type="button" onClick={() => setInspectedIndex(null)}>Latest</button>
    </div>
    <div className="pulse-ema-readout">
      {show20 && <span><i className="pulse-key-20" />EMA 20 <strong>{average20 == null ? "Warming up" : formatPrice(average20, currency)}</strong></span>}
      {show50 && <span><i className="pulse-key-50" />EMA 50 <strong>{average50 == null ? "Warming up" : formatPrice(average50, currency)}</strong></span>}
    </div>
    <details className="pulse-chart-explainer"><summary>How to read the averages</summary><p>EMA 20 and EMA 50 smooth the last 20 and 50 price observations, giving more weight to recent prices. This view uses {history.intervalLabel.toLowerCase()}, so a period means one sample, not one day. Each line begins after enough observations are available.</p></details>
    <div className="pulse-chart-source"><span>{history.stale ? "Cached history" : "CoinGecko history"} · {history.intervalLabel}</span><span>Updated {formatDate(history.sourceUpdatedAt)} UTC</span></div>
  </div>;
}

function SentimentPanel({ resource, onRetry }: { resource: Resource<MarketSentimentPayload>; onRetry: () => void }) {
  const data = resource.data;
  return <section className="pulse-sentiment" aria-labelledby="pulse-sentiment-title">
    <div className="pulse-panel-heading"><h3 id="pulse-sentiment-title">Fear &amp; Greed</h3><span>Crypto market</span></div>
    {data ? <>
      <div className="pulse-sentiment-value"><div><strong>{data.value}</strong><span>/ 100</span></div><span className="pulse-sentiment-label">{data.classification}</span></div>
      <div className="pulse-sentiment-meter" role="meter" aria-label="CoinMarketCap Fear and Greed Index" aria-valuemin={0} aria-valuemax={100} aria-valuenow={data.value} aria-valuetext={`${data.value} out of 100, ${data.classification}`}>
        <span /><span /><span /><span /><span /><i style={{ left: `${data.value}%` }} />
      </div>
      <div className="pulse-sentiment-scale"><span>Extreme fear</span><span>Extreme greed</span></div>
      <p className="pulse-sentiment-source"><a href={data.sourceUrl} target="_blank" rel="noopener noreferrer">CoinMarketCap ↗</a><span>{data.stale || resource.error ? "Cached · " : ""}{formatDate(data.sourceUpdatedAt)} UTC</span></p>
      {resource.error && <p className="pulse-inline-error" role="status">Refresh unavailable. Showing the last reading.</p>}
    </> : <DataMessage loading={resource.loading} error={resource.error} label="Sentiment" onRetry={onRetry} />}
  </section>;
}

export default function MarketPulseApp({ isPresented }: { isPresented: boolean }) {
  const [currency, setCurrency] = useState<MarketCurrency>("usd");
  const [selectedId, setSelectedId] = useState<MarketCoinId>("bitcoin");
  const [days, setDays] = useState<MarketHistoryDays>(7);
  const [show20, setShow20] = useState(true);
  const [show50, setShow50] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [version, setVersion] = useState(0);
  const [visible, setVisible] = useState(true);
  const [sort, setSort] = useState<"rank" | "gainers" | "losers">("rank");
  useEffect(() => {
    const update = () => setVisible(document.visibilityState !== "hidden");
    update(); document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  const active = isPresented && visible;
  useEffect(() => {
    if (!active || !autoRefresh) return;
    const timer = window.setInterval(() => setVersion((value) => value + 1), 90_000);
    return () => window.clearInterval(timer);
  }, [active, autoRefresh]);
  const market = useMarketResource<MarketPayload>(`/api/crypto?currency=${currency}`, active, version);
  const history = useMarketResource<MarketHistoryPayload>(`/api/crypto/history?coin=${selectedId}&currency=${currency}&days=${days}`, active, version);
  const sentiment = useMarketResource<MarketSentimentPayload>("/api/crypto/sentiment", active, version);
  const selected = market.data?.coins.find((coin) => coin.id === selectedId);
  const price = selected?.price ?? history.data?.points.at(-1)?.price;
  const retry = () => setVersion((value) => value + 1);
  const refreshing = market.loading || history.loading || sentiment.loading;
  const coins = useMemo(() => [...(market.data?.coins ?? [])].sort((a, b) => sort === "gainers" ? b.change24h - a.change24h : sort === "losers" ? a.change24h - b.change24h : a.marketCapRank - b.marketCapRank), [market.data, sort]);

  return <div className="pulse-app">
    <header className="pulse-header"><div><span className="pulse-eyebrow">Market desk / 08 assets</span><h2>Market monitor</h2></div>
      <div className="pulse-controls">
        <label className="pulse-currency"><span className="sr-only">Display currency</span><select aria-label="Display currency" value={currency} onChange={(event) => setCurrency(event.target.value as MarketCurrency)}><option value="usd">USD</option><option value="nzd">NZD</option></select></label>
        <button type="button" className="pulse-auto" aria-pressed={autoRefresh} title="Refresh available data every 90 seconds while this app is visible" onClick={() => setAutoRefresh((value) => !value)}><i aria-hidden="true" />Auto {autoRefresh ? "on" : "off"}</button>
        <button type="button" className="pulse-refresh" onClick={retry} disabled={refreshing}>{refreshing ? "Updating…" : "Refresh ↻"}</button>
      </div>
    </header>
    <div className="pulse-workspace">
      <section className="pulse-stage" aria-label={`${assets[selectedId].name} market detail`}>
        <div className="pulse-quote"><div className="pulse-asset"><span className="pulse-asset-mark" aria-hidden="true">{assets[selectedId].symbol.slice(0, 2)}</span><div><label className="sr-only" htmlFor="pulse-asset-select">Chart asset</label><select id="pulse-asset-select" value={selectedId} onChange={(event) => setSelectedId(event.target.value as MarketCoinId)}>{MARKET_COIN_IDS.map((id) => <option key={id} value={id}>{assets[id].name}</option>)}</select><span>{assets[selectedId].symbol} / {currency.toUpperCase()}</span></div></div>
          <div className="pulse-price"><strong>{price === undefined ? "—" : formatPrice(price, currency)}</strong>{selected ? <span data-direction={selected.change24h >= 0 ? "positive" : "negative"}>{formatChange(selected.change24h)} <small>24h</small></span> : <span className="pulse-muted">{history.data ? "Last chart price" : market.error ? "Price unavailable" : "Loading price"}</span>}</div>
        </div>
        {selected && <p className="pulse-quote-time">Quote updated {formatDate(selected.lastUpdated)} UTC</p>}
        <div className="pulse-chart-controls"><div className="pulse-period" role="group" aria-label="Price history range">{([1, 7, 30] as const).map((period) => <button type="button" key={period} aria-pressed={days === period} onClick={() => setDays(period)}>{period === 1 ? "24H" : `${period}D`}</button>)}</div><div className="pulse-indicators"><label><input type="checkbox" checked={show20} onChange={(event) => setShow20(event.target.checked)} /><i className="pulse-key-20" />EMA 20</label><label><input type="checkbox" checked={show50} onChange={(event) => setShow50(event.target.checked)} /><i className="pulse-key-50" />EMA 50</label></div></div>
        {history.error && history.data && <p className="pulse-inline-error" role="alert">History refresh failed. Showing the last available chart.</p>}
        {history.data ? <PriceChart key={`${selectedId}-${currency}-${days}`} history={history.data} currency={currency} show20={show20} show50={show50} /> : <DataMessage loading={history.loading} error={history.error} label="Price history" onRetry={retry} />}
        <dl className="pulse-stats"><div><dt>24h high</dt><dd>{selected ? formatPrice(selected.high24h, currency) : "—"}</dd></div><div><dt>24h low</dt><dd>{selected ? formatPrice(selected.low24h, currency) : "—"}</dd></div><div><dt>Market cap</dt><dd>{selected ? formatPrice(selected.marketCap, currency, true) : "—"}</dd></div><div><dt>24h volume</dt><dd>{selected ? formatPrice(selected.volume24h, currency, true) : "—"}</dd></div></dl>
      </section>
      <aside className="pulse-sidebar">
        <SentimentPanel resource={sentiment} onRetry={retry} />
        <section className="pulse-watchlist" aria-label="Tracked crypto assets"><div className="pulse-panel-heading"><h3>Watchlist</h3><select aria-label="Sort assets" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="rank">Market cap</option><option value="gainers">Top gainers</option><option value="losers">Top losers</option></select></div>
          {market.error && market.data && <p className="pulse-inline-error" role="alert">Showing a previous snapshot. Refresh failed.</p>}
          {coins.length ? <div className="pulse-market-rows">{coins.map((coin) => <button key={coin.id} type="button" aria-pressed={selectedId === coin.id} onClick={() => setSelectedId(coin.id as MarketCoinId)}><span className="pulse-market-name"><strong>{coin.symbol}</strong><small>{coin.name}</small></span><svg viewBox="0 0 60 24" aria-hidden="true"><polyline fill="none" stroke="currentColor" points={coin.prices24h.map((value, index) => { const min = Math.min(...coin.prices24h); const span = Math.max(...coin.prices24h) - min || 1; return `${index / Math.max(1, coin.prices24h.length - 1) * 60},${22 - (value - min) / span * 20}`; }).join(" ")} data-direction={coin.change24h >= 0 ? "positive" : "negative"} /></svg><span className="pulse-market-price"><strong>{formatPrice(coin.price, currency)}</strong><small data-direction={coin.change24h >= 0 ? "positive" : "negative"}>{formatChange(coin.change24h)}</small></span></button>)}</div> : <DataMessage loading={market.loading} error={market.error} label="Market prices" onRetry={retry} />}
          <p className="pulse-watchlist-note">Price changes and mini charts cover 24 hours.</p>
        </section>
      </aside>
    </div>
    <footer className="pulse-footer"><span className="pulse-connection"><i data-cached={Boolean(market.data?.stale || market.error)} aria-hidden="true" />{market.data ? `${market.data.stale || market.error ? "Cached snapshot" : "Price snapshot"} · ${formatDate(market.data.sourceUpdatedAt)} UTC` : market.error ? "Market prices unavailable" : "Waiting for market prices"}</span><a href="https://www.coingecko.com/" target="_blank" rel="noopener noreferrer">Prices by CoinGecko ↗</a></footer>
  </div>;
}
