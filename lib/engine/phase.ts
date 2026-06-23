import type { MarketSnapshot, SectorSnapshot, WavePhase } from "@/lib/types";
import { percentileRank, clamp, round } from "./util";
import { readTrends, TrendRead } from "./trends";

/**
 * Wave lifecycle classifier.
 *
 * Every theme moves through the same arc. We locate a sector on that arc using
 * the interplay between PRICE trend and SOCIAL/ATTENTION trend — because the
 * tells differ at each stage:
 *
 *   emerging      price turning up, attention rising off a low base, not yet
 *                 extended. The quiet accumulation before the crowd arrives.
 *   momentum      price + attention both rising together. The clean markup —
 *                 the part you want to ride.
 *   climax        price parabolic AND attention/sentiment at crowd extremes.
 *                 Everyone already in. Reward thinning, risk fattening.
 *   distribution  price stalling or rolling over while attention is still high
 *                 but FADING from its peak — the classic bearish divergence
 *                 where smart money sells into the crowd. Time to be out.
 *   decline       price down, attention gone. Markdown / dead money.
 */

interface PhaseScore {
  phase: WavePhase;
  raw: number;
}

export function classifyPhase(
  s: SectorSnapshot,
  market: MarketSnapshot
): { phase: WavePhase; confidence: number; rationale: string; trends: TrendRead } {
  const t = readTrends(s);
  const all = market.sectors;

  // Cross-sectional "extremity" — how stretched is this sector vs peers right now.
  const momPop = all.map((x) => x.ret1m + x.ret3m / 2);
  const socialPop = all.map((x) => x.socialDominance);
  const sentPop = all.map((x) => x.sentiment);

  const momExtremity = percentileRank(s.ret1m + s.ret3m / 2, momPop); // 0-100
  const socialExtremity = percentileRank(s.socialDominance, socialPop);
  const sentExtremity = percentileRank(s.sentiment, sentPop);

  const priceUp = t.priceSlope > 0;
  const priceStalling = t.priceSlope <= 0.05; // flat-ish or down
  const socialRising = t.socialSlope > 0.1;
  const socialFading = t.socialSlope < -0.05;
  const rolledOff = t.socialPeakRolloff > 0.18; // >18% off the social peak
  const crowded = socialExtremity > 70 || sentExtremity > 75;
  const stretched = momExtremity > 80;

  // Score each phase; pick the strongest. Scores are heuristic affinities 0-1.
  const scores: PhaseScore[] = [
    {
      phase: "emerging",
      raw:
        aff(priceUp || t.priceSlope > -0.05, 0.3) +
        aff(socialRising, 0.35) +
        aff(momExtremity < 60, 0.2) + // not yet a leader by price
        aff(!crowded, 0.15),
    },
    {
      phase: "momentum",
      raw:
        aff(priceUp && t.priceSlope > 0.08, 0.4) +
        aff(socialRising || (!socialFading && !rolledOff), 0.3) +
        aff(momExtremity > 55, 0.2) +
        aff(!rolledOff, 0.1),
    },
    {
      phase: "climax",
      raw:
        aff(stretched, 0.35) +
        aff(crowded, 0.35) +
        aff(priceUp, 0.15) +
        aff(t.sentimentSlope <= 0.05 && sentExtremity > 70, 0.15), // sentiment maxed/flattening
    },
    {
      phase: "distribution",
      raw:
        aff(priceStalling, 0.3) +
        aff(rolledOff || socialFading, 0.3) +
        aff(t.divergence < -0.1 || (socialExtremity > 55 && priceStalling), 0.25) + // attention high but price not following
        aff(momExtremity > 45, 0.15),
    },
    {
      phase: "decline",
      raw:
        aff(t.priceSlope < -0.05, 0.4) +
        aff(socialFading, 0.25) +
        aff(momExtremity < 35, 0.2) +
        aff(socialExtremity < 45, 0.15),
    },
  ];

  scores.sort((a, b) => b.raw - a.raw);
  const top = scores[0];
  const second = scores[1];
  const confidence = clamp(round(50 + (top.raw - second.raw) * 60), 20, 99);

  return {
    phase: top.phase,
    confidence,
    rationale: rationaleFor(top.phase, t, { momExtremity, socialExtremity, sentExtremity }),
    trends: t,
  };
}

const aff = (cond: boolean, weight: number): number => (cond ? weight : 0);

function rationaleFor(
  phase: WavePhase,
  t: TrendRead,
  ex: { momExtremity: number; socialExtremity: number; sentExtremity: number }
): string {
  const attn = t.socialSlope > 0.1 ? "attention rising" : t.socialSlope < -0.05 ? "attention fading" : "attention flat";
  const px = t.priceSlope > 0.08 ? "price trending up" : t.priceSlope < -0.05 ? "price rolling over" : "price stalling";
  switch (phase) {
    case "emerging":
      return `${cap(attn)} off a low base with ${px} — early accumulation before the crowd arrives.`;
    case "momentum":
      return `${cap(px)} with ${attn} in agreement — clean markup, the part of the wave to ride.`;
    case "climax":
      return `Price stretched (${Math.round(ex.momExtremity)}th pct) with the crowd all-in (sentiment ${Math.round(ex.sentExtremity)}th pct) — euphoria, reward thinning.`;
    case "distribution":
      return `${cap(px)} while ${attn} ${Math.round(t.socialPeakRolloff * 100)}% off its peak — bearish divergence, smart money selling into the crowd.`;
    case "decline":
      return `${cap(px)} with ${attn} — markdown phase, dead money until a base forms.`;
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
