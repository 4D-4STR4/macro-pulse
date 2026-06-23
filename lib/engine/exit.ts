import type { ExitTrigger, MarketSnapshot, SectorSnapshot, WavePhase } from "@/lib/types";
import { clamp, percentileRank, round } from "./util";
import { TrendRead } from "./trends";

/**
 * Exit Signal — "is it time to hop off this wave?", 0-100.
 *
 * Rather than one opaque number, we evaluate a checklist of independent
 * exhaustion triggers, each contributing points with a plain-language reason.
 * This mirrors how a disciplined trader actually de-risks: not on a single
 * indicator, but when several tells stack up at once.
 *
 * The triggers, roughly in order of importance:
 *   - Attention rolling off its peak (the crowd is leaving)
 *   - Bearish price/attention divergence (price up, conversation down)
 *   - Crowd euphoria (sentiment + social at cross-sectional extremes)
 *   - Overextension (price stretched far beyond peers)
 *   - Breadth deterioration (fewer names participating)
 *   - Momentum stalling (price slope flattening / turning)
 */
export function exitSignal(
  s: SectorSnapshot,
  market: MarketSnapshot,
  phase: WavePhase,
  t: TrendRead
): { score: number; triggers: ExitTrigger[] } {
  const all = market.sectors;
  const socialExtremity = percentileRank(s.socialDominance, all.map((x) => x.socialDominance));
  const sentExtremity = percentileRank(s.sentiment, all.map((x) => x.sentiment));
  const momExtremity = percentileRank(s.ret1m + s.ret3m / 2, all.map((x) => x.ret1m + x.ret3m / 2));

  const triggers: ExitTrigger[] = [];

  // 1. Attention rolling off its peak.
  const rolloffPts = Math.round(clamp(t.socialPeakRolloff * 90, 0, 30));
  triggers.push({
    key: "attention_rolloff",
    label: "Attention rolling off peak",
    points: 30,
    fired: t.socialPeakRolloff > 0.18,
    detail:
      t.socialPeakRolloff > 0.05
        ? `Conversation ${Math.round(t.socialPeakRolloff * 100)}% below its recent peak — the crowd is starting to leave.`
        : `Conversation still at/near its peak.`,
  });
  triggers[0].points = rolloffPts;

  // 2. Bearish price / attention divergence.
  const divergent = t.priceSlope > 0.03 && t.socialSlope < -0.05;
  triggers.push({
    key: "divergence",
    label: "Price/attention divergence",
    points: divergent ? 22 : 0,
    fired: divergent,
    detail: divergent
      ? "Price still grinding up while attention fades — classic distribution tell."
      : "Price and attention not diverging.",
  });

  // 3. Crowd euphoria.
  const euphoric = sentExtremity > 75 && socialExtremity > 65;
  triggers.push({
    key: "euphoria",
    label: "Crowd euphoria",
    points: euphoric ? 18 : sentExtremity > 70 ? 9 : 0,
    fired: euphoric,
    detail: euphoric
      ? `Sentiment ${Math.round(sentExtremity)}th pct and attention ${Math.round(socialExtremity)}th pct — everyone's already in.`
      : `Sentiment ${Math.round(sentExtremity)}th pct — not yet at a crowd extreme.`,
  });

  // 4. Overextension vs peers.
  const overextended = momExtremity > 85;
  triggers.push({
    key: "overextension",
    label: "Price overextended",
    points: overextended ? 14 : momExtremity > 75 ? 7 : 0,
    fired: overextended,
    detail: `Trailing return in the ${Math.round(momExtremity)}th percentile vs all sectors${
      overextended ? " — stretched, mean-reversion risk." : "."
    }`,
  });

  // 5. Breadth deterioration: price up but participation thin.
  const thinBreadth = t.priceSlope > 0.02 && s.breadth < 45;
  triggers.push({
    key: "breadth",
    label: "Breadth deterioration",
    points: thinBreadth ? 12 : s.breadth < 35 ? 8 : 0,
    fired: thinBreadth || s.breadth < 35,
    detail: `${Math.round(s.breadth)}% of names above their 50d MA${
      thinBreadth ? " while the index rises — fewer generals carrying the move." : "."
    }`,
  });

  // 6. Momentum stalling after a strong run.
  const stalling = t.priceSlope <= 0.02 && momExtremity > 55;
  triggers.push({
    key: "stalling",
    label: "Momentum stalling",
    points: stalling ? 10 : 0,
    fired: stalling,
    detail: stalling
      ? "Upward price thrust is flattening after a strong run."
      : "Price thrust intact.",
  });

  let score = triggers.reduce((acc, tr) => acc + tr.points, 0);

  // Phase prior: distribution/climax inherently elevate the urgency,
  // emerging/momentum suppress it.
  const phaseBias: Record<WavePhase, number> = {
    emerging: -15,
    momentum: -8,
    climax: 12,
    distribution: 18,
    decline: 5,
  };
  score = clamp(score + phaseBias[phase]);

  return { score: round(score), triggers };
}
