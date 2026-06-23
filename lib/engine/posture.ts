import type { MarketPosture, SectorAnalysis } from "@/lib/types";
import { clamp, round } from "./util";

/**
 * Market posture — the one-line risk read of the whole tape.
 *
 * Built from conviction breadth: how many sectors carry genuine bullish
 * conviction vs bearish, weighted by their conviction score. A tape where most
 * sectors are bullish with aligned signals is risk-on; one where leadership is
 * narrow or rolling over is risk-off.
 */
export function marketPosture(sectors: SectorAnalysis[]): MarketPosture {
  let net = 0;
  let bull = 0;
  let bear = 0;
  for (const s of sectors) {
    const w = s.conviction.score / 100;
    if (s.conviction.direction === "bullish") {
      net += w;
      if (s.conviction.score >= 45) bull++;
    } else if (s.conviction.direction === "bearish") {
      net -= w;
      if (s.conviction.score >= 45) bear++;
    }
  }
  const score = round(clamp((net / sectors.length) * 220, -100, 100));

  let label: MarketPosture["label"];
  if (score >= 45) label = "Risk-on";
  else if (score >= 15) label = "Leaning risk-on";
  else if (score > -15) label = "Mixed";
  else if (score > -45) label = "Leaning risk-off";
  else label = "Risk-off";

  return {
    label,
    score,
    detail: `${bull} sector${bull === 1 ? "" : "s"} with bullish conviction, ${bear} bearish — breadth ${
      score >= 0 ? "favors offense" : "favors defense"
    }.`,
  };
}
