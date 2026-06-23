import type {
  ConvictionFactor,
  ConvictionRead,
  MarketSnapshot,
  SectorSnapshot,
  SignalDirection,
} from "@/lib/types";
import { clamp, percentileRank, round } from "./util";
import { readTrends } from "./trends";

/**
 * Conviction — the signal-amplification layer.
 *
 * Heat tells you how hot a sector is. Conviction tells you whether to TRUST it,
 * by measuring how strongly the independent signals agree:
 *
 *   momentum · relative strength · attention trend · breadth · sentiment
 *
 * Each is reduced to a directional reading in [-1, +1]. The conviction score is
 * the magnitude of their mean — which is high only when the factors are both
 * individually strong AND pointing the same way, and collapses toward zero when
 * they conflict. A hot sector with five aligned signals is a clean ride; a hot
 * sector with momentum up but attention and breadth rolling over is a trap.
 */

const clampDir = (x: number) => Math.max(-1, Math.min(1, x));
const centerPct = (p: number) => (p - 50) / 50; // percentile 0-100 -> [-1, 1]

function blendedMomentum(s: SectorSnapshot): number {
  return 0.45 * s.ret1w + 0.35 * s.ret1m + 0.2 * (s.ret3m / 3);
}

export function sectorConviction(s: SectorSnapshot, market: MarketSnapshot): ConvictionRead {
  const all = market.sectors;
  const t = readTrends(s);

  const momDir = centerPct(percentileRank(blendedMomentum(s), all.map(blendedMomentum)));
  const rsDir = centerPct(
    percentileRank(0.6 * s.rs1m + 0.4 * s.rs3m, all.map((x) => 0.6 * x.rs1m + 0.4 * x.rs3m))
  );
  const socialDir = clampDir(t.socialSlope / 0.6); // rising attention = bullish
  const breadthDir = clampDir((s.breadth - 50) / 35);
  const sentDir = centerPct(percentileRank(s.sentiment, all.map((x) => x.sentiment)));

  const factors: ConvictionFactor[] = [
    { key: "momentum", label: "Momentum", dir: round(momDir, 2) },
    { key: "rs", label: "Rel. strength", dir: round(rsDir, 2) },
    { key: "attention", label: "Attention", dir: round(socialDir, 2) },
    { key: "breadth", label: "Breadth", dir: round(breadthDir, 2) },
    { key: "sentiment", label: "Sentiment", dir: round(sentDir, 2) },
  ];

  const dirs = factors.map((f) => f.dir);
  const meanDir = dirs.reduce((a, b) => a + b, 0) / dirs.length;
  // Amplify slightly so a fully-aligned set reaches the top of the scale.
  const score = round(clamp(Math.abs(meanDir) * 125));

  const direction: SignalDirection =
    meanDir > 0.08 ? "bullish" : meanDir < -0.08 ? "bearish" : "neutral";

  const aligned =
    direction === "neutral"
      ? 0
      : factors.filter((f) => Math.sign(f.dir) === Math.sign(meanDir) && Math.abs(f.dir) > 0.05)
          .length;
  const agreement = round((aligned / factors.length) * 100);

  return {
    score,
    direction,
    agreement,
    factors,
    summary: summarize(direction, aligned, factors.length, score),
  };
}

function summarize(dir: SignalDirection, aligned: number, total: number, score: number): string {
  if (dir === "neutral") return "Signals are mixed — no clear edge either way.";
  const strength = score >= 70 ? "high conviction" : score >= 45 ? "moderate conviction" : "low conviction";
  return `${aligned}/${total} signals ${dir} — ${strength}.`;
}
