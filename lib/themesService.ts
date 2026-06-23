import type { MarketAnalysis, MarketSnapshot } from "@/lib/types";
import { analyzeThemes } from "@/lib/engine/themes";
import { computeLiveThemes } from "@/lib/data/liveThemes";

/**
 * Resolve the theme analysis for the current market, choosing the data source:
 *   1. snapshot already carries themes (demo/seed)  → analyze them.
 *   2. live price provider (stooq)                   → compute baskets from
 *      constituents' real prices, then analyze.
 *   3. otherwise (or on failure)                     → null (themes hidden).
 *
 * Cached briefly per process so the dashboard board and a ticker lookup in the
 * same window don't recompute the (fetch-heavy) live baskets twice.
 */
let cache: { at: number; analysis: MarketAnalysis | null } | null = null;
const TTL_MS = 5 * 60 * 1000;

export async function themeAnalysisFor(market: MarketSnapshot): Promise<MarketAnalysis | null> {
  if (market.themes && market.themes.length) {
    // Seed themes are deterministic — no need to cache.
    return analyzeThemes(market);
  }

  if (cache && Date.now() - cache.at < TTL_MS) return cache.analysis;

  let analysis: MarketAnalysis | null = null;
  const provider = (process.env.MARKET_DATA_PROVIDER || "").toLowerCase();
  if (provider === "stooq" || market.source === "stooq") {
    try {
      const themes = await computeLiveThemes(market);
      if (themes && themes.length) analysis = analyzeThemes({ ...market, themes });
    } catch {
      analysis = null;
    }
  }

  cache = { at: Date.now(), analysis };
  return analysis;
}
