import type { MarketSnapshot, WavePhase } from "@/lib/types";
import { analyzeMarket } from "./index";
import { marketAsOf } from "./asOf";

/**
 * Signal backtest — does the engine actually have edge?
 *
 * Walks the history day by day. At each historical day t we reconstruct the
 * market "as of" t (via marketAsOf), run the SAME engine, and record each
 * sector's phase / exit score / heat rank — then measure the realized forward
 * return over the next `horizon` trading days. Aggregating across all days and
 * sectors tells us whether the signals precede the moves they claim:
 *
 *   - Do momentum/emerging phases lead positive forward returns, and
 *     distribution/decline lead negative ones?
 *   - When the hop-off (exit) signal is high, are forward returns worse?
 *   - Do heat leaders keep leading, or mean-revert?
 *
 * On the bundled snapshot the numbers are illustrative (synthetic paths); the
 * methodology is real and the same code runs against live history.
 */

export interface PhaseStat {
  phase: WavePhase;
  n: number;
  avgFwd: number; // average forward return (%)
  hitRate: number; // % of samples with positive forward return
}

export interface BucketStat {
  key: string;
  label: string;
  n: number;
  avgFwd: number;
  hitRate: number;
}

export interface BacktestResult {
  horizonDays: number;
  samples: number;
  windowDays: number;
  phases: PhaseStat[];
  exitBuckets: BucketStat[];
  heatBuckets: BucketStat[];
  /** Spread between the best and worst phase — a crude "edge" headline (pp). */
  phaseSpread: number;
  /** Forward-return gap: low-exit minus high-exit (positive = exit signal works). */
  exitEdge: number;
  source: MarketSnapshot["source"];
}

const PHASE_ORDER: WavePhase[] = ["emerging", "momentum", "climax", "distribution", "decline"];
const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);
const round = (x: number, dp = 2) => Math.round(x * 10 ** dp) / 10 ** dp;

interface Sample {
  phase: WavePhase;
  exit: number;
  heatRank: number;
  fwd: number;
}

export function backtest(market: MarketSnapshot, horizon = 10): BacktestResult {
  const L = market.sectors[0]?.history.length ?? 0;
  const warmup = 25;
  const priceById = new Map(market.sectors.map((s) => [s.id, s.history.map((h) => h.price)]));

  const samples: Sample[] = [];
  for (let t = warmup; t <= L - 1 - horizon; t++) {
    const daysAgo = L - 1 - t;
    const asOf = marketAsOf(market, daysAgo);
    const a = analyzeMarket(asOf);
    for (const sa of a.sectors) {
      const prices = priceById.get(sa.sector.id);
      if (!prices) continue;
      const pT = prices[t];
      const pF = prices[t + horizon];
      if (!pT || !pF) continue;
      samples.push({ phase: sa.phase, exit: sa.exitScore, heatRank: sa.heatRank, fwd: pct(pF, pT) });
    }
  }

  const agg = (rows: Sample[]): { avgFwd: number; hitRate: number; n: number } => {
    if (!rows.length) return { avgFwd: 0, hitRate: 0, n: 0 };
    const avg = rows.reduce((s, r) => s + r.fwd, 0) / rows.length;
    const hits = rows.filter((r) => r.fwd > 0).length;
    return { avgFwd: round(avg), hitRate: round((hits / rows.length) * 100, 0), n: rows.length };
  };

  const phases: PhaseStat[] = PHASE_ORDER.map((phase) => {
    const { avgFwd, hitRate, n } = agg(samples.filter((s) => s.phase === phase));
    return { phase, n, avgFwd, hitRate };
  }).filter((p) => p.n > 0);

  const bucket = (key: string, label: string, rows: Sample[]): BucketStat => {
    const { avgFwd, hitRate, n } = agg(rows);
    return { key, label, n, avgFwd, hitRate };
  };

  const exitBuckets = [
    bucket("low", "Low exit (<25)", samples.filter((s) => s.exit < 25)),
    bucket("mid", "Mid exit (25–50)", samples.filter((s) => s.exit >= 25 && s.exit < 50)),
    bucket("high", "High exit (≥50)", samples.filter((s) => s.exit >= 50)),
  ].filter((b) => b.n > 0);

  const heatBuckets = [
    bucket("leaders", "Heat leaders (#1–4)", samples.filter((s) => s.heatRank <= 4)),
    bucket("middle", "Mid pack (#5–8)", samples.filter((s) => s.heatRank >= 5 && s.heatRank <= 8)),
    bucket("laggards", "Laggards (#9+)", samples.filter((s) => s.heatRank >= 9)),
  ].filter((b) => b.n > 0);

  const phaseVals = phases.map((p) => p.avgFwd);
  const phaseSpread = phaseVals.length ? round(Math.max(...phaseVals) - Math.min(...phaseVals)) : 0;
  const low = exitBuckets.find((b) => b.key === "low")?.avgFwd ?? 0;
  const high = exitBuckets.find((b) => b.key === "high")?.avgFwd ?? 0;

  return {
    horizonDays: horizon,
    samples: samples.length,
    windowDays: L,
    phases,
    exitBuckets,
    heatBuckets,
    phaseSpread,
    exitEdge: round(low - high),
    source: market.source,
  };
}
