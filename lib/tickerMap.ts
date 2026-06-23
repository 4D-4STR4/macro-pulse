import { getMarketData } from "@/lib/data/provider";
import { analyzeDaily } from "@/lib/engine";
import { normalizeSymbol, TICKER_COVERAGE } from "@/lib/data/tickers";
import { classifyTicker } from "@/lib/data/classifyTicker";
import { fetchDailySeries } from "@/lib/data/stooqProvider";
import { computeStockScore, mapTicker, type TickerMap, type StockScore } from "@/lib/engine/ticker";

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

  // Classify, fetch market analysis, and fetch the stock's own series in parallel.
  const [result, analysis, stock] = await Promise.all([
    classifyTicker(symbol),
    getMarketData().then(analyzeDaily),
    tryStockScore(symbol),
  ]);

  return mapTicker(result, symbol, analysis, TICKER_COVERAGE, { stock });
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
