import type { MarketAnalysis, SectorAnalysis, SignalChange, WavePhase } from "@/lib/types";
import { PHASE_META } from "@/lib/ui";
import { round } from "./util";

/**
 * Signal-change detection — the reason to open the app every day.
 *
 * Diffs the current read against the prior one and emits ranked, plain-language
 * changes: phase flips, freshly-triggered (or cleared) exits, sectors breaking
 * into the next wave, big heat-rank moves, and conviction swings. Severity
 * decides what surfaces at the top of the feed and in the briefing.
 */

const EXIT_THRESHOLD = 55; // exit score that counts as "triggered"

/**
 * How bullish each phase is for a holder. NOT the same as lifecycle order:
 * momentum is the best place to be, climax is toppy, decline is worst. A
 * transition's direction is the sign of the change in this value, so
 * emerging→momentum reads bullish while momentum→distribution reads bearish.
 */
const PHASE_BULLISHNESS: Record<WavePhase, number> = {
  emerging: 1,
  momentum: 3,
  climax: 1,
  distribution: -2,
  decline: -3,
};

const phaseRank = (p: WavePhase) => PHASE_META[p].order; // 0 emerging .. 4 decline

export function detectChanges(prev: MarketAnalysis, curr: MarketAnalysis): SignalChange[] {
  const prevById = new Map(prev.sectors.map((s) => [s.sector.id, s]));
  const prevNextWave = new Set(prev.nextWave.map((s) => s.sector.id));
  const changes: SignalChange[] = [];

  for (const c of curr.sectors) {
    const p = prevById.get(c.sector.id);
    if (!p) continue;
    const base = { id: c.sector.id, sector: c.sector.name, etf: c.sector.etf };

    // --- phase transition ---
    // Only report forward lifecycle moves (a wave doesn't truly regress from
    // markup back to accumulation) plus the bullish decline→emerging reset, and
    // gate on confidence — together this strips boundary wavering from the feed.
    const forward = phaseRank(c.phase) > phaseRank(p.phase);
    const bullishReset = p.phase === "decline" && c.phase === "emerging";
    if (p.phase !== c.phase && c.phaseConfidence >= 52 && (forward || bullishReset)) {
      const delta = PHASE_BULLISHNESS[c.phase] - PHASE_BULLISHNESS[p.phase];
      const dir = delta > 0 ? "bullish" : delta < 0 ? "bearish" : "neutral";
      const sev = 55 + Math.abs(delta) * 9 + (c.phase === "distribution" ? 18 : 0);
      changes.push({
        ...base,
        type: "phase",
        direction: dir,
        severity: clampSev(sev),
        headline: `${c.sector.name} shifted ${PHASE_META[p.phase].label} → ${PHASE_META[c.phase].label}`,
        detail: c.phaseRationale,
      });
    }

    // --- exit trigger crossing ---
    if (p.exitScore < EXIT_THRESHOLD && c.exitScore >= EXIT_THRESHOLD) {
      changes.push({
        ...base,
        type: "exit-trigger",
        direction: "bearish",
        severity: clampSev(70 + (c.exitScore - EXIT_THRESHOLD)),
        headline: `Exit signal triggered on ${c.sector.name}`,
        detail: `Hop-off score crossed ${EXIT_THRESHOLD} (now ${c.exitScore}). ${c.verdict}`,
      });
    } else if (p.exitScore >= EXIT_THRESHOLD && c.exitScore < EXIT_THRESHOLD) {
      changes.push({
        ...base,
        type: "exit-cleared",
        direction: "bullish",
        severity: 48,
        headline: `${c.sector.name} exit signal cleared`,
        detail: `Hop-off score fell back below ${EXIT_THRESHOLD} (now ${c.exitScore}).`,
      });
    }

    // --- new exhaustion trigger firing (even below threshold) ---
    const prevFired = new Set(p.exitTriggers.filter((t) => t.fired).map((t) => t.key));
    const freshly = c.exitTriggers.filter((t) => t.fired && !prevFired.has(t.key));
    if (freshly.length && !(p.exitScore < EXIT_THRESHOLD && c.exitScore >= EXIT_THRESHOLD)) {
      const top = freshly.sort((a, b) => b.points - a.points)[0];
      changes.push({
        ...base,
        type: "new-trigger",
        direction: "bearish",
        severity: clampSev(40 + top.points),
        headline: `${c.sector.name}: ${top.label.toLowerCase()}`,
        detail: top.detail,
      });
    }

    // --- broke into the next-wave shortlist ---
    if (!prevNextWave.has(c.sector.id) && curr.nextWave.some((s) => s.sector.id === c.sector.id)) {
      changes.push({
        ...base,
        type: "next-wave-in",
        direction: "bullish",
        severity: clampSev(52 + (c.inflowScore - 60)),
        headline: `${c.sector.name} broke into the Next Wave`,
        detail: `Inflow score ${c.inflowScore} — capital starting to rotate in. ${c.verdict}`,
      });
    }

    // --- big heat-rank move ---
    const rankDelta = p.heatRank - c.heatRank; // positive = climbed
    if (Math.abs(rankDelta) >= 2) {
      const up = rankDelta > 0;
      changes.push({
        ...base,
        type: "heat-rank",
        direction: up ? "bullish" : "bearish",
        severity: clampSev(35 + Math.abs(rankDelta) * 6),
        headline: `${c.sector.name} ${up ? "climbed" : "slid"} to #${c.heatRank} by heat`,
        detail: `Heat rank ${up ? "up" : "down"} ${Math.abs(rankDelta)} (was #${p.heatRank}, now #${c.heatRank}).`,
      });
    }

    // --- conviction swing ---
    const convDelta = c.conviction.score * dirSign(c.conviction.direction) - p.conviction.score * dirSign(p.conviction.direction);
    if (Math.abs(convDelta) >= 22) {
      const up = convDelta > 0;
      changes.push({
        ...base,
        type: "conviction",
        direction: up ? "bullish" : "bearish",
        severity: clampSev(32 + Math.abs(convDelta) / 2),
        headline: `${c.sector.name} conviction turning ${up ? "up" : "down"}`,
        detail: c.conviction.summary,
      });
    }
  }

  return changes.sort((a, b) => b.severity - a.severity);
}

const dirSign = (d: "bullish" | "bearish" | "neutral") => (d === "bullish" ? 1 : d === "bearish" ? -1 : 0);
const clampSev = (x: number) => round(Math.max(1, Math.min(100, x)));
