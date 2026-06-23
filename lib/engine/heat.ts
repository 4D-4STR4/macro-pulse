import type { MarketSnapshot, ScoreComponent, SectorSnapshot } from "@/lib/types";
import { clamp, percentileRank, round } from "./util";
import { readTrends } from "./trends";

/**
 * Heat Score — "how hot is this sector right now", 0-100.
 *
 * It blends five cross-sectional dimensions, each ranked against the other
 * sectors so the score is always relative to the current opportunity set:
 *
 *   1. Price momentum   (35%) — blended 1w/1m/3m return
 *   2. Relative strength (20%) — out/under-performance vs the benchmark
 *   3. Social momentum  (20%) — rising attention (social-dominance slope + galaxy)
 *   4. Sentiment        (12%) — bullishness of the conversation
 *   5. Breadth          (13%) — participation under the surface
 *
 * Momentum is weighted heaviest because price leadership is the definition of
 * the "current wave"; social and breadth confirm whether it has fuel left.
 */

const WEIGHTS = {
  momentum: 0.35,
  rs: 0.2,
  social: 0.2,
  sentiment: 0.12,
  breadth: 0.13,
};

function blendedMomentum(s: SectorSnapshot): number {
  // Favor the medium-term trend but reward fresh acceleration.
  return 0.45 * s.ret1w + 0.35 * s.ret1m + 0.2 * (s.ret3m / 3);
}

export function heatComponents(
  s: SectorSnapshot,
  market: MarketSnapshot
): { components: ScoreComponent[]; score: number } {
  const all = market.sectors;

  const momPop = all.map(blendedMomentum);
  const rsPop = all.map((x) => 0.6 * x.rs1m + 0.4 * x.rs3m);
  const socialPop = all.map((x) => {
    const t = readTrends(x);
    return 0.6 * t.socialSlope + 0.4 * ((x.galaxyScore - 50) / 5);
  });
  const sentPop = all.map((x) => x.sentiment);
  const breadthPop = all.map((x) => x.breadth);

  const mom = blendedMomentum(s);
  const rs = 0.6 * s.rs1m + 0.4 * s.rs3m;
  const t = readTrends(s);
  const social = 0.6 * t.socialSlope + 0.4 * ((s.galaxyScore - 50) / 5);

  const components: ScoreComponent[] = [
    {
      key: "momentum",
      label: "Price momentum",
      value: percentileRank(mom, momPop),
      weight: WEIGHTS.momentum,
      detail: `1w ${fmt(s.ret1w)} · 1m ${fmt(s.ret1m)} · 3m ${fmt(s.ret3m)}`,
    },
    {
      key: "rs",
      label: "Relative strength",
      value: percentileRank(rs, rsPop),
      weight: WEIGHTS.rs,
      detail: `${fmt(s.rs1m)} vs ${market.benchmark} (1m) · ${fmt(s.rs3m)} (3m)`,
    },
    {
      key: "social",
      label: "Social momentum",
      value: percentileRank(social, socialPop),
      weight: WEIGHTS.social,
      detail: `Galaxy ${Math.round(s.galaxyScore)} · attention ${t.socialSlope >= 0 ? "rising" : "fading"}`,
    },
    {
      key: "sentiment",
      label: "Sentiment",
      value: percentileRank(s.sentiment, sentPop),
      weight: WEIGHTS.sentiment,
      detail: `${Math.round(s.sentiment)}/100 bullishness`,
    },
    {
      key: "breadth",
      label: "Breadth",
      value: percentileRank(s.breadth, breadthPop),
      weight: WEIGHTS.breadth,
      detail: `${Math.round(s.breadth)}% of names above 50d MA`,
    },
  ];

  const score = clamp(
    components.reduce((acc, c) => acc + c.value * c.weight, 0)
  );

  return { components: components.map((c) => ({ ...c, value: round(c.value) })), score: round(score) };
}

function fmt(x: number): string {
  return `${x >= 0 ? "+" : ""}${round(x)}%`;
}
