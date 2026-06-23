import { NextResponse } from "next/server";
import { buildTickerMap } from "@/lib/tickerMap";

export const dynamic = "force-dynamic";

/**
 * GET /api/ticker/{symbol}
 * Returns the Ticker Map: sector classification + role, the stock's own score
 * (when live data is available), and a combined, reasoned read.
 */
export async function GET(_req: Request, { params }: { params: { symbol: string } }) {
  try {
    const map = await buildTickerMap(params.symbol);
    return NextResponse.json(map);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to build ticker map" },
      { status: 500 },
    );
  }
}
