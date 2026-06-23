import type {
  MarketSnapshot,
  SectorHistoryPoint,
  SectorSnapshot,
} from "@/lib/types";
import { SECTORS } from "./sectors";

/**
 * Live PRICES via Stooq's free daily CSV endpoint — no API key, no CORS issue
 * (server-side fetch only). Each equity sector is tracked through its SPDR
 * sector ETF (XLK, XLE, ...) plus the benchmark (SPY).
 *
 * Stooq has no social data, so the social fields (sentiment, socialDominance,
 * galaxyScore, interactions, breadth) are filled with a TRANSPARENT, fully
 * deterministic price/volume-derived PROXY — see `socialProxy` below. The moment
 * a LUNARCRUSH_API_KEY is supplied the provider layer switches to real social
 * data with no code changes.
 *
 * CSV endpoint: https://stooq.com/q/d/l/?s={ticker}.us&i=d
 *   header: Date,Open,High,Low,Close,Volume
 *
 * NOTE: if Stooq is unreachable (offline / sandbox) this throws, and the
 * provider layer (provider.ts) falls back to the bundled snapshot.
 */

// Keep roughly a calendar quarter of trading days, matching the snapshot/LC shape.
const WINDOW = 90;

const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);
const clamp = (x: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, x));

interface DailyRow {
  date: string; // YYYY-MM-DD
  close: number;
  volume: number;
}

export type { DailyRow };

/**
 * Fetch a single ticker's daily series (live). Used by the Ticker Map and live
 * theme baskets. Throws if unreachable (the caller degrades rather than faking).
 */
export async function fetchDailySeries(ticker: string): Promise<DailyRow[]> {
  return fetchCsv(ticker);
}

/**
 * Fetch a ticker's recent daily bars, source-agnostic.
 *
 * Yahoo's chart endpoint is the PRIMARY source: it's keyless and (unlike Stooq)
 * reachable from datacenter/serverless IPs like Vercel's. Stooq is kept as a
 * fallback for environments where Yahoo is blocked. This is why stock scores and
 * live sector/theme prices work on a deploy with no API key.
 */
async function fetchCsv(ticker: string): Promise<DailyRow[]> {
  // FMP first when a key is present — it's reliable from datacenter/serverless
  // IPs where keyless feeds (Yahoo chart, Stooq) are often blocked.
  if (process.env.FMP_API_KEY) {
    try {
      return await fetchFmpPrices(ticker);
    } catch {
      /* fall through to keyless sources */
    }
  }
  try {
    return await fetchYahooChart(ticker);
  } catch {
    return await fetchStooqCsv(ticker);
  }
}

/** Financial Modeling Prep daily EOD prices (keyed, datacenter-friendly). */
async function fetchFmpPrices(ticker: string): Promise<DailyRow[]> {
  const sym = ticker.toUpperCase();
  const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(sym)}?timeseries=150&apikey=${process.env.FMP_API_KEY}`;
  const init: RequestInit & { next?: { revalidate: number } } = {
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(5000),
  };
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`FMP ${sym} -> ${res.status}`);
  const json = (await res.json()) as { historical?: Array<{ date?: string; close?: number; volume?: number }> };
  const hist = json?.historical;
  if (!hist || hist.length < 2) throw new Error(`FMP ${sym} returned no series`);
  // FMP returns newest-first; reverse to ascending.
  const rows: DailyRow[] = [];
  for (let i = hist.length - 1; i >= 0; i--) {
    const h = hist[i];
    if (!h.date || h.close == null || !Number.isFinite(h.close) || h.close <= 0) continue;
    rows.push({ date: h.date, close: h.close, volume: Number.isFinite(h.volume ?? NaN) ? (h.volume as number) : 0 });
  }
  if (rows.length < 2) throw new Error(`FMP ${sym} returned no usable rows`);
  return rows;
}

/** Like fetchCsv but resolves to null instead of throwing — for per-sector resilience. */
async function fetchCsvSafe(ticker: string): Promise<DailyRow[] | null> {
  try {
    return await fetchCsv(ticker);
  } catch {
    return null;
  }
}

/** Yahoo Finance chart API → daily rows (keyless, datacenter-friendly). */
async function fetchYahooChart(ticker: string): Promise<DailyRow[]> {
  const sym = ticker.toUpperCase().replace(/\./g, "-"); // BRK.B -> BRK-B
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=6mo&interval=1d`;
  const init: RequestInit & { next?: { revalidate: number } } = {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MacroPulse/1.0)" },
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(4500),
  };
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Yahoo ${sym} -> ${res.status}`);
  const json = (await res.json()) as {
    chart?: { result?: Array<{ timestamp?: number[]; indicators?: { quote?: Array<{ close?: (number | null)[]; volume?: (number | null)[] }> } }> };
  };
  const r = json?.chart?.result?.[0];
  const ts = r?.timestamp;
  const q = r?.indicators?.quote?.[0];
  if (!ts || !q?.close) throw new Error(`Yahoo ${sym} returned no series`);
  const rows: DailyRow[] = [];
  for (let i = 0; i < ts.length; i++) {
    const close = q.close[i];
    if (close == null || !Number.isFinite(close) || close <= 0) continue;
    rows.push({
      date: new Date(ts[i] * 1000).toISOString().slice(0, 10),
      close,
      volume: Number.isFinite(q.volume?.[i] ?? NaN) ? (q.volume![i] as number) : 0,
    });
  }
  if (rows.length < 2) throw new Error(`Yahoo ${sym} returned no usable rows`);
  return rows;
}

/** Stooq daily CSV → rows (fallback source). One quick retry on transient errors. */
async function fetchStooqCsv(ticker: string, attempt = 0): Promise<DailyRow[]> {
  const sym = ticker.toLowerCase().replace(/\./g, "-");
  const url = `https://stooq.com/q/d/l/?s=${sym}.us&i=d`;
  const init: RequestInit & { next?: { revalidate: number } } = {
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(4500),
  };
  try {
    const res = await fetch(url, init);
    if (!res.ok) {
      throw new Error(`Stooq ${ticker} -> ${res.status} ${res.statusText}`);
    }
    const rows = parseCsv(await res.text());
    if (rows.length < 2) throw new Error(`Stooq ${ticker} returned no usable rows`);
    return rows;
  } catch (err) {
    if (attempt < 1) {
      await new Promise((r) => setTimeout(r, 400));
      return fetchStooqCsv(ticker, attempt + 1);
    }
    throw err;
  }
}

/** Robustly parse Stooq daily CSV (Date,Open,High,Low,Close,Volume). */
function parseCsv(text: string): DailyRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const rows: DailyRow[] = [];
  for (const line of lines) {
    if (!line) continue;
    // Skip the header (and any stray non-data lines Stooq may emit on error).
    if (/^date,/i.test(line)) continue;
    const cols = line.split(",");
    if (cols.length < 5) continue;
    const date = cols[0];
    const close = Number(cols[4]);
    const volume = Number(cols[5] ?? 0);
    // Skip rows with a missing/null/non-numeric close.
    if (!date || !Number.isFinite(close) || close <= 0) continue;
    rows.push({ date, close, volume: Number.isFinite(volume) ? volume : 0 });
  }
  return rows;
}

const trailingReturn = (prices: number[], lookback: number): number => {
  if (prices.length < 2) return 0;
  const end = prices[prices.length - 1];
  const start = prices[Math.max(0, prices.length - 1 - lookback)];
  return pct(end, start);
};

/** Recent momentum (%) over `n` trailing days, ending at index `i`. */
function momentumAt(prices: number[], i: number, n: number): number {
  const start = prices[Math.max(0, i - n)];
  return pct(prices[i], start);
}

/** N-day simple moving average of `prices` ending at index `i`. */
function smaAt(prices: number[], i: number, n: number): number {
  const lo = Math.max(0, i - n + 1);
  let sum = 0;
  for (let k = lo; k <= i; k++) sum += prices[k];
  return sum / (i - lo + 1);
}

/**
 * Transparent social PROXY derived purely from price/volume so charts look
 * sensible and the engine has something to chew on until real social data is
 * wired in. Everything here is deterministic from the input series.
 */
interface ProxyDay {
  socialDominance: number;
  sentiment: number;
  galaxyScore: number;
  interactions: number;
}

function socialProxyAt(
  prices: number[],
  volumes: number[],
  i: number,
  benchPrices: number[],
  totalActivity: number, // sum of |5d move| * volume across all sectors at last bar
): ProxyDay {
  const mom5 = momentumAt(prices, i, 5);
  const mom21 = momentumAt(prices, i, 21);
  // Relative strength of this bar vs benchmark over ~1m.
  const bIdx = Math.min(i, benchPrices.length - 1);
  const benchMom21 = momentumAt(benchPrices, bIdx, 21);
  const rs = mom21 - benchMom21;

  // sentiment: 50 + scaled recent momentum (clamp 1-99).
  const sentiment = clamp(50 + mom5 * 2.2, 1, 99);
  // galaxyScore: blend of recent momentum + relative strength (clamp 1-100).
  const galaxyScore = clamp(50 + mom5 * 1.6 + rs * 1.1, 1, 100);
  // interactions: volume (a real, observable engagement-like quantity).
  const interactions = Math.round(volumes[i] || 0);
  // socialDominance: this bar's share of |recent move| * volume across sectors.
  const activity = Math.abs(mom5) * (volumes[i] || 0);
  const socialDominance =
    totalActivity > 0 ? clamp((activity / totalActivity) * 100, 0, 100) : 0;

  return { socialDominance, sentiment, galaxyScore, interactions };
}

export async function fetchStooq(): Promise<MarketSnapshot> {
  const benchmark = process.env.MARKET_BENCHMARK || "SPY";

  // Fetch benchmark + all 11 sector ETFs in parallel. The benchmark is required
  // (it's the relative-strength reference); individual sectors are resilient —
  // a single flaky ticker shouldn't collapse the whole live feed.
  const [benchRows, ...sectorResults] = await Promise.all([
    fetchCsv(benchmark),
    ...SECTORS.map((def) => fetchCsvSafe(def.etf)),
  ]);

  // Benchmark window + returns (the reference for relative strength).
  const bench = benchRows.slice(-WINDOW);
  const benchPrices = bench.map((r) => r.close);
  if (benchPrices.length < 2) {
    throw new Error(`Stooq benchmark ${benchmark} returned no usable history`);
  }
  const bRet1m = trailingReturn(benchPrices, 21);
  const bRet3m = trailingReturn(benchPrices, 63);

  // Keep only sectors that returned usable history, trimmed to the window.
  const trimmed = SECTORS.map((def, idx) => ({ def, rows: sectorResults[idx] }))
    .filter((x): x is { def: (typeof SECTORS)[number]; rows: DailyRow[] } => !!x.rows && x.rows.length >= 2)
    .map(({ def, rows }) => ({ def, rows: rows.slice(-WINDOW) }));

  // Require a quorum so we never render a misleadingly sparse board; otherwise
  // throw and let provider.ts fall back to the bundled snapshot.
  if (trimmed.length < 8) {
    throw new Error(`Stooq returned only ${trimmed.length}/${SECTORS.length} sectors`);
  }

  // Cross-sectional activity at the last bar: sum of |5d move| * last volume.
  const totalActivity = trimmed.reduce((acc, { rows }) => {
    if (rows.length < 1) return acc;
    const prices = rows.map((r) => r.close);
    const last = prices.length - 1;
    const vol = rows[last]?.volume || 0;
    return acc + Math.abs(momentumAt(prices, last, 5)) * vol;
  }, 0);

  const sectors: SectorSnapshot[] = trimmed.map(({ def, rows }) => {
    const prices = rows.map((r) => r.close);
    const volumes = rows.map((r) => r.volume);
    const last = prices.length - 1;

    // Per-day history with consistent social proxy fields.
    const history: SectorHistoryPoint[] = rows.map((r, i) => {
      const p = socialProxyAt(prices, volumes, i, benchPrices, totalActivity);
      return {
        date: r.date,
        price: r.close,
        socialDominance: p.socialDominance,
        sentiment: p.sentiment,
        interactions: p.interactions,
        galaxyScore: p.galaxyScore,
      };
    });

    // Latest-bar proxy = the snapshot scalars (kept identical to last history pt).
    const today = history[last] ?? {
      socialDominance: 0,
      sentiment: 50,
      interactions: 0,
      galaxyScore: 50,
    };

    const ret1m = trailingReturn(prices, 21);
    const ret3m = trailingReturn(prices, 63);

    // breadth: % of the last ~30 days the close finished above its 20-day MA.
    const lookback = Math.min(30, prices.length);
    let above = 0;
    for (let k = prices.length - lookback; k < prices.length; k++) {
      if (k < 0) continue;
      if (prices[k] >= smaAt(prices, k, 20)) above++;
    }
    const breadth = lookback > 0 ? clamp((above / lookback) * 100, 0, 100) : 50;

    return {
      id: def.id,
      name: def.name,
      etf: def.etf,
      description: def.description,
      leaders: def.leaders,
      price: prices[last] ?? 0,
      ret1d: trailingReturn(prices, 1),
      ret1w: trailingReturn(prices, 5),
      ret1m,
      ret3m,
      retYtd: trailingReturn(prices, prices.length - 1),
      rs1m: ret1m - bRet1m,
      rs3m: ret3m - bRet3m,
      galaxyScore: today.galaxyScore,
      // altRank is filled after ranking all sectors below.
      altRank: 999,
      socialDominance: today.socialDominance,
      sentiment: today.sentiment,
      interactions: today.interactions,
      breadth,
      history,
    };
  });

  // altRank: rank by galaxy score (1 = best), mirroring the snapshot generator.
  [...sectors]
    .sort((a, b) => b.galaxyScore - a.galaxyScore)
    .forEach((s, i) => (s.altRank = i + 1));

  return {
    asOf: new Date().toISOString(),
    benchmark,
    benchmarkRet1m: bRet1m,
    benchmarkRet3m: bRet3m,
    benchmarkHistory: benchPrices,
    source: "stooq",
    note:
      "Live prices (Yahoo, Stooq fallback). Social metrics are a price/volume-derived " +
      "proxy until a LunarCrush API key is set.",
    sectors,
  };
}
