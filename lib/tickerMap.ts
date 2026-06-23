import { getMarketData } from "@/lib/data/provider";
import { analyzeDaily } from "@/lib/engine";
import { resolveTicker, normalizeSymbol, TICKER_COVERAGE } from "@/lib/data/tickers";
import { fetchDailySeries } from "@/lib/data/stooqProvider";
import { computeStockScore, mapTicker, type TickerMap, type StockScore } from "@/lib/engine/ticker";

/**
 * Build the full Ticker Map for a symbol: sector context (always) + the stock's
 * own score (only when live price data is reachable). The individual-stock fetch
 * is best-effort — if Stooq is unreachable we degrade to sector-only context and
 * say so, rather than inventing stock numbers.
 */
export async function buildTickerMap(rawSymbol: string): Promise<TickerMap> {
  const symbol = normalizeSymbol(rawSymbol);
  const classification = resolveTicker(symbol);

  const market = await getMarketData();
  const analysis = analyzeDaily(market);

  let stock: StockScore | undefined;
  if (classification) {
    stock = await tryStockScore(symbol);
  }

  return mapTicker(classification, symbol, analysis, TICKER_COVERAGE, { stock });
}

/** Best-effort live stock score from Stooq (stock + SPY for relative strength). */
async function tryStockScore(symbol: string): Promise<StockScore | undefined> {
  try {
    const benchmark = process.env.MARKET_BENCHMARK || "SPY";
    const [rows, benchRows] = await Promise.all([
      fetchDailySeries(symbol),
      fetchDailySeries(benchmark).catch(() => null),
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
