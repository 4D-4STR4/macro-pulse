import type { CycleRead, CycleStage, MarketSnapshot, SectorAnalysis } from "@/lib/types";
import { clamp, round } from "./util";

/**
 * Macro cycle-clock inference.
 *
 * Sector leadership rotates with the business cycle in a well-documented order.
 * We don't know the cycle stage directly, so we INFER it from which sectors are
 * currently leading, then use the clock to point at what classically leads next.
 *
 * Stylized leadership map (Sam Stovall / Fidelity-style rotation):
 *   early       Consumer Cyclical, Financials, Real Estate, Industrials
 *   mid         Technology, Communication Services, Industrials
 *   late        Energy, Materials, Consumer Staples (Healthcare firming)
 *   recession   Utilities, Consumer Staples, Healthcare
 *
 * The clock then advances: early -> mid -> late -> recession -> early.
 */

const STAGE_LEADERS: Record<CycleStage, string[]> = {
  early: ["consumer-cyclical", "financial-services", "real-estate", "industrials"],
  mid: ["technology", "communication-services", "industrials"],
  late: ["energy", "basic-materials", "consumer-defensive"],
  recession: ["utilities", "consumer-defensive", "healthcare"],
};

const NEXT_STAGE: Record<CycleStage, CycleStage> = {
  early: "mid",
  mid: "late",
  late: "recession",
  recession: "early",
};

const STAGE_META: Record<CycleStage, { label: string; description: string }> = {
  early: {
    label: "Early cycle",
    description:
      "Recovery off a trough — rates easing, growth re-accelerating. Cyclicals, financials and rate-sensitives lead.",
  },
  mid: {
    label: "Mid cycle",
    description:
      "Peak growth, healthy momentum. Secular growth (tech, comms) and capex (industrials) lead the tape.",
  },
  late: {
    label: "Late cycle",
    description:
      "Growth still positive but topping, inflation/commodity pressure building. Energy, materials and defensives take the baton.",
  },
  recession: {
    label: "Defensive / contraction",
    description:
      "Growth contracting, risk-off. Capital hides in utilities, staples and healthcare — earnings that hold up in a downturn.",
  },
};

export function inferCycle(
  market: MarketSnapshot,
  ranked: SectorAnalysis[]
): CycleRead {
  // Weight the top sectors by heat to build a "leadership profile".
  const heatById = new Map(ranked.map((r) => [r.sector.id, r.heatScore]));
  const topIds = ranked.slice(0, 5).map((r) => r.sector.id);

  const stageFit = (Object.keys(STAGE_LEADERS) as CycleStage[]).map((stage) => {
    const leaders = STAGE_LEADERS[stage];
    // How much of this stage's leadership is actually leading right now?
    let fit = 0;
    for (const id of leaders) {
      const heat = heatById.get(id) ?? 0;
      const rankBonus = topIds.includes(id) ? 15 : 0;
      fit += heat + rankBonus;
    }
    fit /= leaders.length;
    return { stage, fit };
  });

  stageFit.sort((a, b) => b.fit - a.fit);
  const best = stageFit[0];
  const second = stageFit[1];
  const confidence = clamp(round(45 + (best.fit - second.fit) * 1.2), 25, 96);
  const next = NEXT_STAGE[best.stage];

  return {
    stage: best.stage,
    confidence,
    label: STAGE_META[best.stage].label,
    description: STAGE_META[best.stage].description,
    leadsNow: STAGE_LEADERS[best.stage],
    rotatesToward: STAGE_LEADERS[next],
    nextStage: next,
  };
}

/** Sectors the cycle clock says should lead next, that exist in our universe. */
export function cycleDestinations(cycle: CycleRead, market: MarketSnapshot): string[] {
  const ids = new Set(market.sectors.map((s) => s.id));
  return cycle.rotatesToward.filter((id) => ids.has(id));
}
