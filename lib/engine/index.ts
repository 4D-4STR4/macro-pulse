import type {
  MarketAnalysis,
  MarketSnapshot,
  RotationEdge,
  SectorAnalysis,
} from "@/lib/types";
import { clamp, percentileRank, round } from "./util";
import { heatComponents } from "./heat";
import { classifyPhase } from "./phase";
import { exitSignal } from "./exit";
import { inferCycle, cycleDestinations } from "./cycle";
import { sectorConviction } from "./conviction";
import { marketPosture } from "./posture";
import { marketAsOf } from "./asOf";
import { detectChanges } from "./diff";
import { buildBriefing } from "./briefing";

/**
 * The MacroPulse analysis engine entry point.
 *
 * Takes a normalized MarketSnapshot and returns a full MarketAnalysis:
 * heat-ranked sectors, lifecycle phases, exit signals, a predicted next wave,
 * an inferred macro cycle stage, and the directional rotation edges that drive
 * the rotation map.
 */
export function analyzeMarket(market: MarketSnapshot): MarketAnalysis {
  // --- Pass 1: per-sector scores ---
  const partial = market.sectors.map((sector) => {
    const { components, score: heatScore } = heatComponents(sector, market);
    const { phase, confidence, rationale, trends } = classifyPhase(sector, market);
    const { score: exitScore, triggers } = exitSignal(sector, market, phase, trends);

    return {
      sector,
      heatScore,
      heatComponents: components,
      phase,
      phaseConfidence: confidence,
      phaseRationale: rationale,
      exitScore,
      exitTriggers: triggers,
      trends: {
        priceSlope: round(trends.priceSlope, 3),
        socialSlope: round(trends.socialSlope, 3),
        interactionsSlope: round(trends.interactionsSlope, 3),
        divergence: round(trends.divergence, 3),
        socialPeakRolloff: round(trends.socialPeakRolloff, 3),
      },
      conviction: sectorConviction(sector, market),
      verdict: "",
      inflowScore: 0,
      heatRank: 0,
    } as SectorAnalysis;
  });

  // --- Pass 2: inflow score (rotation attractiveness) ---
  // Capital rotates toward sectors that are heating up but NOT yet exhausted:
  // rising attention + improving relative strength + healthy breadth, while the
  // price is not already stretched and the exit signal is still low.
  const rsPop = market.sectors.map((x) => 0.6 * x.rs1m + 0.4 * x.rs3m);
  const momPop = market.sectors.map((x) => x.ret1m + x.ret3m / 2);

  for (const a of partial) {
    const s = a.sector;
    const rs = percentileRank(0.6 * s.rs1m + 0.4 * s.rs3m, rsPop);
    const notStretched = 100 - percentileRank(s.ret1m + s.ret3m / 2, momPop);
    const risingAttention = clamp(50 + a.trends.socialSlope * 8);
    const earlyBonus = a.phase === "emerging" ? 20 : a.phase === "momentum" ? 8 : a.phase === "decline" ? -10 : 0;
    const exitDrag = a.exitScore * 0.35;

    a.inflowScore = round(
      clamp(
        0.3 * rs +
          0.25 * risingAttention +
          0.2 * notStretched +
          0.15 * s.breadth +
          0.1 * a.heatScore +
          earlyBonus -
          exitDrag
      )
    );
  }

  // --- Pass 3: ranking + verdicts ---
  const sectors = [...partial].sort((a, b) => b.heatScore - a.heatScore);
  sectors.forEach((a, i) => {
    a.heatRank = i + 1;
    a.verdict = verdictFor(a);
  });

  const hottest = sectors[0];
  const cycle = inferCycle(market, sectors);

  const nextWave = [...sectors]
    .filter((a) => a !== hottest)
    .sort((a, b) => b.inflowScore - a.inflowScore)
    .slice(0, 4);

  const exiting = [...sectors]
    .filter((a) => a.exitScore >= 45)
    .sort((a, b) => b.exitScore - a.exitScore);

  const rotations = buildRotationEdges(sectors, hottest, nextWave, cycle, market);
  const posture = marketPosture(sectors);

  return {
    asOf: market.asOf,
    source: market.source,
    note: market.note,
    benchmark: market.benchmark,
    hottest,
    sectors,
    nextWave,
    exiting,
    cycle,
    rotations,
    posture,
  };
}

/**
 * The daily entry point: analyzes today, reconstructs the prior read from
 * history, diffs them into ranked signal changes, and writes the briefing.
 * This is what the dashboard and /api/market consume.
 */
export function analyzeDaily(market: MarketSnapshot, compareDaysAgo = 1): MarketAnalysis {
  const today = analyzeMarket(market);
  const prior = analyzeMarket(marketAsOf(market, compareDaysAgo));
  const changes = detectChanges(prior, today);
  const briefing = buildBriefing(today, changes);
  return { ...today, comparedTo: prior.asOf, changes, briefing };
}

function verdictFor(a: SectorAnalysis): string {
  if (a.phase === "emerging" && a.inflowScore > 55)
    return "Accumulate — early wave with capital starting to flow in.";
  if (a.phase === "momentum")
    return a.exitScore > 55
      ? "Ride with a trailing stop — strong but showing first signs of exhaustion."
      : "Ride it — clean uptrend with room to run.";
  if (a.phase === "climax")
    return "Trim into strength — euphoric and stretched; protect gains.";
  if (a.phase === "distribution")
    return "Exit / avoid new entries — the wave is topping and rolling over.";
  if (a.phase === "emerging") return "Watchlist — building a base, not confirmed yet.";
  return "Avoid — markdown phase, wait for a new base to form.";
}

function buildRotationEdges(
  sectors: SectorAnalysis[],
  hottest: SectorAnalysis,
  nextWave: SectorAnalysis[],
  cycle: ReturnType<typeof inferCycle>,
  market: MarketSnapshot
): RotationEdge[] {
  const edges: RotationEdge[] = [];
  const byId = new Map(sectors.map((s) => [s.sector.id, s]));

  // Sources of outflow: sectors flashing exit / in distribution / climax.
  const sources = sectors
    .filter((s) => s.exitScore >= 50 || s.phase === "distribution" || s.phase === "climax")
    .sort((a, b) => b.exitScore - a.exitScore)
    .slice(0, 3);

  // Destinations: data-driven next wave + cycle-clock picks, de-duplicated.
  const destIds = new Set<string>(nextWave.map((n) => n.sector.id));
  for (const id of cycleDestinations(cycle, market)) destIds.add(id);
  const dests = [...destIds]
    .map((id) => byId.get(id))
    .filter((x): x is SectorAnalysis => !!x && x !== hottest)
    .sort((a, b) => b.inflowScore - a.inflowScore)
    .slice(0, 4);

  for (const src of sources.length ? sources : [hottest]) {
    for (const dst of dests) {
      if (src.sector.id === dst.sector.id) continue;
      const cycleMatch = cycle.rotatesToward.includes(dst.sector.id);
      const strength = clamp(
        round(0.5 * dst.inflowScore + 0.3 * src.exitScore + (cycleMatch ? 18 : 0))
      );
      edges.push({
        fromId: src.sector.id,
        toId: dst.sector.id,
        strength,
        rationale: cycleMatch
          ? `${src.sector.name} exhausting; ${dst.sector.name} is both heating up and the cycle-clock's next leader.`
          : `${src.sector.name} exhausting while ${dst.sector.name} attracts fresh flows.`,
      });
    }
  }

  return edges.sort((a, b) => b.strength - a.strength).slice(0, 8);
}

export { analyzeMarket as default };
