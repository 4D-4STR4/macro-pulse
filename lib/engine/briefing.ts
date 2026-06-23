import type { DailyBriefing, MarketAnalysis, SignalChange } from "@/lib/types";
import { PHASE_META } from "@/lib/ui";

/**
 * Daily Pulse briefing — the 10-second read.
 *
 * Deterministically synthesizes the analysis + detected changes into a headline,
 * a 2-3 sentence narrative, and the top moves. Templated natural language (no
 * LLM) so it's fast, free and reliable.
 */
export function buildBriefing(curr: MarketAnalysis, changes: SignalChange[]): DailyBriefing {
  const lead = curr.hottest;
  const keyMoves = changes.slice(0, 3);
  const topExit = curr.exiting[0];
  const topNext = curr.nextWave[0];

  // Headline: lead change if there is a dramatic one, else the leadership read.
  const dramatic = changes.find((c) => c.severity >= 70);
  const headline = dramatic
    ? dramatic.headline
    : `${lead.sector.name} leads — ${PHASE_META[lead.phase].label.toLowerCase()}, ${lead.conviction.direction} conviction ${lead.conviction.score}`;

  // Narrative.
  const parts: string[] = [];
  parts.push(
    `${lead.sector.name} (${lead.sector.etf}) is the hottest wave at heat ${lead.heatScore}, ${describeConviction(lead.conviction.score, lead.conviction.agreement)}.`
  );
  if (topExit) {
    parts.push(
      `${topExit.sector.name} is flashing exit (${topExit.exitScore}/100) — ${PHASE_META[topExit.phase].label.toLowerCase()}.`
    );
  }
  if (topNext) {
    parts.push(
      `Capital is rotating toward ${topNext.sector.name} (inflow ${topNext.inflowScore}) as the cycle reads ${curr.cycle.label.toLowerCase()}.`
    );
  }
  parts.push(`Tape posture: ${curr.posture.label.toLowerCase()}.`);

  return {
    date: curr.asOf,
    headline,
    narrative: parts.join(" "),
    keyMoves,
  };
}

function describeConviction(score: number, agreement: number): string {
  if (score >= 70) return `with high conviction (${agreement}% of signals aligned)`;
  if (score >= 45) return `with moderate conviction (${agreement}% aligned)`;
  return `but conviction is low (${agreement}% aligned) — trust it less`;
}
