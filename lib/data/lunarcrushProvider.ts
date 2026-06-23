import type {
  MarketSnapshot,
  SectorHistoryPoint,
  SectorSnapshot,
} from "@/lib/types";
import { SECTORS } from "./sectors";

/**
 * Live data via the LunarCrush API v4.
 *
 * Strategy: each equity sector is tracked through its SPDR sector ETF, which is
 * a first-class LunarCrush topic (e.g. "$xlk"). We pull a snapshot + ~3 months
 * of daily history per sector ETF and the benchmark, then normalize into the
 * exact same shape the bundled snapshot uses — so the engine/UI can't tell the
 * difference.
 *
 * Docs: https://lunarcrush.com/developers/api/endpoints
 *
 * NOTE: requires LUNARCRUSH_API_KEY. Without a key the provider layer falls back
 * to the bundled snapshot automatically (see provider.ts).
 */

const BASE = "https://lunarcrush.com/api4/public";

async function lc<T>(path: string): Promise<T> {
  const key = process.env.LUNARCRUSH_API_KEY;
  if (!key) throw new Error("LUNARCRUSH_API_KEY is not set");
  // `next.revalidate` is a Next.js fetch extension; type it explicitly so this
  // file also typechecks outside the Next build context.
  const init: RequestInit & { next?: { revalidate: number } } = {
    headers: { Authorization: `Bearer ${key}` },
    // Sector data moves slowly intraday; cache for 30 min to stay within limits.
    next: { revalidate: 1800 },
  };
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    throw new Error(`LunarCrush ${path} -> ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

interface LCTopic {
  data?: {
    close?: number;
    percent_change_24h?: number;
    percent_change_7d?: number;
    percent_change_30d?: number;
    galaxy_score?: number;
    alt_rank?: number;
    social_dominance?: number;
    sentiment?: number;
    interactions_24h?: number;
  };
}

interface LCTimeSeries {
  data?: Array<{
    time: number; // unix seconds
    close?: number;
    social_dominance?: number;
    sentiment?: number;
    interactions?: number;
    galaxy_score?: number;
  }>;
}

const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);

function toHistory(ts: LCTimeSeries): SectorHistoryPoint[] {
  return (ts.data ?? []).map((d) => ({
    date: new Date(d.time * 1000).toISOString().slice(0, 10),
    price: d.close ?? 0,
    socialDominance: d.social_dominance ?? 0,
    // LunarCrush sentiment is 0-100 in v4 topic series; pass through, clamp.
    sentiment: Math.max(0, Math.min(100, d.sentiment ?? 50)),
    interactions: d.interactions ?? 0,
    galaxyScore: d.galaxy_score ?? 50,
  }));
}

async function fetchSector(etf: string): Promise<{
  snap: LCTopic["data"];
  history: SectorHistoryPoint[];
}> {
  const topic = `$${etf.toLowerCase()}`;
  const [snap, ts] = await Promise.all([
    lc<LCTopic>(`/topic/${encodeURIComponent(topic)}/v1`),
    lc<LCTimeSeries>(
      `/topic/${encodeURIComponent(topic)}/time-series/v2?bucket=day&interval=3m`
    ),
  ]);
  return { snap: snap.data, history: toHistory(ts) };
}

export async function fetchLunarCrush(): Promise<MarketSnapshot> {
  const benchmark = process.env.MARKET_BENCHMARK || "SPY";

  // Benchmark history for relative-strength computation.
  const benchTs = await lc<LCTimeSeries>(
    `/topic/${encodeURIComponent(`$${benchmark.toLowerCase()}`)}/time-series/v2?bucket=day&interval=3m`
  );
  const bench = toHistory(benchTs).map((p) => p.price);
  const bRet1m = trailingReturn(bench, 21);
  const bRet3m = trailingReturn(bench, 63);

  const results = await Promise.all(
    SECTORS.map(async (def) => {
      const { snap, history } = await fetchSector(def.etf);
      const prices = history.map((p) => p.price);

      const sector: SectorSnapshot = {
        id: def.id,
        name: def.name,
        etf: def.etf,
        description: def.description,
        leaders: def.leaders,
        price: snap?.close ?? prices[prices.length - 1] ?? 0,
        ret1d: snap?.percent_change_24h ?? trailingReturn(prices, 1),
        ret1w: snap?.percent_change_7d ?? trailingReturn(prices, 5),
        ret1m: snap?.percent_change_30d ?? trailingReturn(prices, 21),
        ret3m: trailingReturn(prices, 63),
        retYtd: trailingReturn(prices, prices.length - 1),
        rs1m: (snap?.percent_change_30d ?? trailingReturn(prices, 21)) - bRet1m,
        rs3m: trailingReturn(prices, 63) - bRet3m,
        galaxyScore: snap?.galaxy_score ?? 50,
        altRank: snap?.alt_rank ?? 999,
        socialDominance: snap?.social_dominance ?? 0,
        sentiment: Math.max(0, Math.min(100, snap?.sentiment ?? 50)),
        interactions: snap?.interactions_24h ?? 0,
        // Breadth isn't directly exposed per ETF; approximate from galaxy score
        // until a constituent feed is wired in.
        breadth: Math.max(0, Math.min(100, (snap?.galaxy_score ?? 50) + 5)),
        history,
      };
      return sector;
    })
  );

  return {
    asOf: new Date().toISOString(),
    benchmark,
    benchmarkRet1m: bRet1m,
    benchmarkRet3m: bRet3m,
    source: "lunarcrush",
    sectors: results,
  };
}

function trailingReturn(prices: number[], lookback: number): number {
  if (prices.length < 2) return 0;
  const end = prices[prices.length - 1];
  const start = prices[Math.max(0, prices.length - 1 - lookback)];
  return pct(end, start);
}
