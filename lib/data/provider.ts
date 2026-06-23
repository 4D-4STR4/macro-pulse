import type { MarketSnapshot } from "@/lib/types";
import { loadSnapshot } from "./snapshotProvider";
import { fetchLunarCrush } from "./lunarcrushProvider";

/**
 * A data provider returns a normalized MarketSnapshot. Swapping providers never
 * touches the engine or the UI — they only ever see the normalized shape.
 */
export interface MarketDataProvider {
  name: MarketSnapshot["source"];
  getMarket(): Promise<MarketSnapshot>;
}

/**
 * Provider selection:
 *   - MARKET_DATA_PROVIDER env forces a choice ("snapshot" | "lunarcrush")
 *   - otherwise: LunarCrush if an API key is present, else the bundled snapshot.
 *
 * The bundled snapshot means the app is fully functional with zero config; the
 * moment a LUNARCRUSH_API_KEY is added it goes live with no code changes.
 */
export function selectProvider(): MarketDataProvider {
  const forced = process.env.MARKET_DATA_PROVIDER?.toLowerCase();
  const hasKey = !!process.env.LUNARCRUSH_API_KEY;

  if (forced === "lunarcrush" || (forced !== "snapshot" && hasKey)) {
    return {
      name: "lunarcrush",
      getMarket: () => fetchLunarCrush(),
    };
  }

  return {
    name: "snapshot",
    getMarket: () => loadSnapshot(),
  };
}

/**
 * Resolve the market data, falling back to the bundled snapshot if a live
 * provider errors out (rate limit, network, missing key, etc.). The app should
 * never show a blank screen because an upstream feed hiccuped.
 */
export async function getMarketData(): Promise<MarketSnapshot> {
  const provider = selectProvider();
  try {
    return await provider.getMarket();
  } catch (err) {
    if (provider.name !== "snapshot") {
      const snapshot = await loadSnapshot();
      snapshot.note =
        `Live provider (${provider.name}) unavailable — showing bundled snapshot. ` +
        (err instanceof Error ? err.message : String(err));
      return snapshot;
    }
    throw err;
  }
}
