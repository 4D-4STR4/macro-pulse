import { NextResponse } from "next/server";
import { getMarketData } from "@/lib/data/provider";
import { analyzeDaily } from "@/lib/engine";

// Always evaluate fresh; the data layer handles its own caching.
export const dynamic = "force-dynamic";

/**
 * GET /api/market
 * Returns the full MarketAnalysis (heat-ranked sectors, phases, exit signals,
 * next-wave, cycle read, rotation edges). This is the single endpoint the UI —
 * or any external client / trading bot — consumes.
 */
export async function GET() {
  try {
    const market = await getMarketData();
    const analysis = analyzeDaily(market);
    return NextResponse.json(analysis);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to build market analysis" },
      { status: 500 }
    );
  }
}
