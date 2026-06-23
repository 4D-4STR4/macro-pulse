import type { MarketSnapshot, SectorSnapshot } from "@/lib/types";

/**
 * Rebuild a MarketSnapshot "as of" N days ago from the history each sector
 * already carries. Feeding the result back through analyzeMarket yields the
 * prior read we diff against — so change-detection is real and works identically
 * with live data (where the history is real).
 *
 * Breadth isn't stored per-day, so it's held constant (a minor, secondary
 * factor); everything that drives phase/exit/heat/conviction — price, returns,
 * relative strength, attention, sentiment — is recomputed from history.
 */

const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);

function trailing(prices: number[], lookback: number): number {
  if (prices.length < 2) return 0;
  const end = prices[prices.length - 1];
  const start = prices[Math.max(0, prices.length - 1 - lookback)];
  return pct(end, start);
}

export function marketAsOf(market: MarketSnapshot, daysAgo: number): MarketSnapshot {
  if (daysAgo <= 0) return market;

  const bench = market.benchmarkHistory;
  let bRet1m = market.benchmarkRet1m;
  let bRet3m = market.benchmarkRet3m;
  if (bench && bench.length > daysAgo) {
    const bt = bench.slice(0, bench.length - daysAgo);
    bRet1m = trailing(bt, 21);
    bRet3m = trailing(bt, 63);
  }

  const sectors: SectorSnapshot[] = market.sectors.map((s) => {
    const h = s.history.slice(0, Math.max(2, s.history.length - daysAgo));
    const prices = h.map((p) => p.price);
    const last = h[h.length - 1];
    const ret1m = trailing(prices, 21);
    const ret3m = trailing(prices, 63);
    return {
      ...s,
      price: round(last.price, 2),
      ret1d: round(trailing(prices, 1), 2),
      ret1w: round(trailing(prices, 5), 2),
      ret1m: round(ret1m, 2),
      ret3m: round(ret3m, 2),
      retYtd: round(trailing(prices, prices.length - 1), 2),
      rs1m: round(ret1m - bRet1m, 2),
      rs3m: round(ret3m - bRet3m, 2),
      socialDominance: last.socialDominance,
      sentiment: last.sentiment,
      galaxyScore: last.galaxyScore,
      interactions: last.interactions,
      breadth: s.breadth, // held constant — see module note
      history: h,
    };
  });

  // Re-rank AltRank by galaxy score for the earlier day.
  [...sectors]
    .sort((a, b) => b.galaxyScore - a.galaxyScore)
    .forEach((s, i) => (s.altRank = i + 1));

  const asOfDate = sectors[0]?.history[sectors[0].history.length - 1]?.date;
  return {
    ...market,
    asOf: asOfDate ? `${asOfDate}T13:00:00.000Z` : market.asOf,
    benchmarkRet1m: round(bRet1m, 2),
    benchmarkRet3m: round(bRet3m, 2),
    sectors,
  };
}

const round = (x: number, dp = 2) => {
  const f = 10 ** dp;
  return Math.round(x * f) / f;
};
