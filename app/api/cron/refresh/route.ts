import { NextResponse } from "next/server";
import { getMarketData } from "@/lib/data/provider";
import { analyzeDaily } from "@/lib/engine";
import { themeAnalysisFor } from "@/lib/themesService";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // allow time to warm all the live fetches

/**
 * GET /api/cron/refresh
 *
 * Warms the data cache: pulls the live market + theme baskets so the underlying
 * price fetches (each cached ~30 min via revalidate) are fresh. Point a cron at
 * this so visitors never hit a cold, slow first request.
 *
 * Free on Vercel Hobby (daily cron). For more frequent refresh, use a Vercel Pro
 * cron or a free external pinger (cron-job.org, UptimeRobot) hitting this URL.
 */
export async function GET() {
  const started = Date.now();
  try {
    const market = await getMarketData();
    const analysis = analyzeDaily(market);
    const themes = await themeAnalysisFor(market);
    return NextResponse.json({
      ok: true,
      source: market.source,
      sectors: analysis.sectors.length,
      themes: themes?.sectors.length ?? 0,
      ms: Date.now() - started,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "refresh failed" },
      { status: 500 },
    );
  }
}
