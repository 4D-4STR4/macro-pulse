import type { MarketAnalysis, MarketSnapshot } from "@/lib/types";
import { analyzeMarket } from "./index";

/**
 * Analyze the cross-cutting themes with the exact same machinery as sectors.
 *
 * Themes are structurally identical to sectors (a basket with price/attention
 * history), so we feed them through analyzeMarket as if they were the sector
 * universe. The result's per-unit reads — heat, phase, exit, conviction, inflow,
 * nextWave, exiting — are all valid for themes. (The macro cycle-clock is
 * sector-specific and meaningless for themes, so callers ignore `cycle`.)
 *
 * Returns null when the snapshot carries no themes (e.g. a live provider that
 * doesn't yet populate them) — callers then hide theme features rather than
 * inventing data.
 */
export function analyzeThemes(market: MarketSnapshot): MarketAnalysis | null {
  if (!market.themes || market.themes.length === 0) return null;
  const themeMarket: MarketSnapshot = { ...market, sectors: market.themes };
  return analyzeMarket(themeMarket);
}
