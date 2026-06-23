import { getMarketData } from "@/lib/data/provider";
import { analyzeDaily } from "@/lib/engine";
import { analyzeThemes } from "@/lib/engine/themes";
import { normalizeSymbol, TICKER_COVERAGE } from "@/lib/data/tickers";
import { themesForTicker } from "@/lib/data/themes";
import { classifyTicker } from "@/lib/data/classifyTicker";
import { fetchDailySeries } from "@/lib/data/stooqProvider";
import {
  computeStockScore,
  mapTicker,
  unitRole,
  ROLE_LABEL,
  type TickerMap,
  type StockScore,
  type ThemeRead,
} from "@/lib/engine/ticker";

/**
 * Build the full Ticker Map for ANY symbol:
 *   - classify the sector (curated → live lookup → none),
 *   - score the stock from its own live price action (best-effort),
 *   - assemble a reasoned, confidence-weighted read.
 *
 * Both the classification and the price fetch are resilient: if a live source
 * is unreachable we degrade honestly (sector-only, or stock-only, or an explicit
 * "unclassified") rather than inventing data.
 */
export async function buildTickerMap(rawSymbol: string): Promise<TickerMap> {
  const symbol = normalizeSymbol(rawSymbol);

  // Classify, fetch market data, and fetch the stock's own series in parallel.
  const [result, market, stock] = await Promise.all([
    classifyTicker(symbol),
    getMarketData(),
    tryStockScore(symbol),
  ]);
  const analysis = analyzeDaily(market);

  // Score the cross-cutting themes this ticker rides (independent of its sector).
  const themes = readTickerThemes(symbol, market);

  return mapTicker(result, symbol, analysis, TICKER_COVERAGE, { stock, themes });
}

/** Build the theme reads for a ticker from the (themed) snapshot. */
function readTickerThemes(symbol: string, market: Parameters<typeof analyzeThemes>[0]): ThemeRead[] {
  const themeMA = analyzeThemes(market);
  if (!themeMA) return [];
  const defs = themesForTicker(symbol);
  const reads: ThemeRead[] = [];
  for (const def of defs) {
    const ta = themeMA.sectors.find((s) => s.sector.id === def.id);
    if (!ta) continue;
    const { role } = unitRole(ta, themeMA);
    reads.push({
      id: def.id,
      name: def.name,
      heatScore: ta.heatScore,
      heatRank: ta.heatRank,
      totalThemes: themeMA.sectors.length,
      phase: ta.phase,
      exitScore: ta.exitScore,
      role,
      roleLabel: ROLE_LABEL[role],
      conviction: { score: ta.conviction.score, direction: ta.conviction.direction },
    });
  }
  return reads.sort((a, b) => b.heatScore - a.heatScore);
}

/** Stooq uses dashes for class shares (BRK.B → brk-b). */
function toStooqTicker(symbol: string): string {
  return symbol.replace(/\./g, "-");
}

/** Best-effort live stock score from Stooq (stock + SPY for relative strength). */
async function tryStockScore(symbol: string): Promise<StockScore | undefined> {
  try {
    const benchmark = process.env.MARKET_BENCHMARK || "SPY";
    const [rows, benchRows] = await Promise.all([
      fetchDailySeries(toStooqTicker(symbol)),
      fetchDailySeries(toStooqTicker(benchmark)).catch(() => null),
    ]);
    if (!rows || rows.length < 21) return undefined;
    return computeStockScore(
      { close: rows.map((r) => r.close), volume: rows.map((r) => r.volume) },
      benchRows ? benchRows.map((r) => r.close) : undefined,
    );
  } catch {
    return undefined;
  }
}
