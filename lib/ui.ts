import type { WavePhase, CycleStage } from "@/lib/types";

/** Presentation metadata for each wave phase. Single source of truth for the UI. */
export const PHASE_META: Record<
  WavePhase,
  { label: string; short: string; color: string; text: string; blurb: string; order: number }
> = {
  emerging: {
    label: "Emerging",
    short: "Accumulation",
    color: "#38bdf8",
    text: "Quiet money moving in before the crowd. Best risk/reward entry.",
    blurb: "Attention rising off a low base, price starting to turn up.",
    order: 0,
  },
  momentum: {
    label: "Momentum",
    short: "Markup",
    color: "#22c55e",
    text: "The clean trend. Ride it while price and attention rise together.",
    blurb: "Price and conversation rising in agreement.",
    order: 1,
  },
  climax: {
    label: "Climax",
    short: "Euphoria",
    color: "#f59e0b",
    text: "Everyone's in. Reward thinning, risk fattening — start trimming.",
    blurb: "Price parabolic, sentiment maxed, crowd all-in.",
    order: 2,
  },
  distribution: {
    label: "Distribution",
    short: "Topping",
    color: "#ef4444",
    text: "Smart money selling into the crowd. Time to be out.",
    blurb: "Price stalling while attention rolls off its peak.",
    order: 3,
  },
  decline: {
    label: "Decline",
    short: "Markdown",
    color: "#71717a",
    text: "Dead money. Wait for a new base before looking again.",
    blurb: "Price falling, attention gone.",
    order: 4,
  },
};

export const PHASE_ORDER: WavePhase[] = [
  "emerging",
  "momentum",
  "climax",
  "distribution",
  "decline",
];

export const CYCLE_META: Record<CycleStage, { angle: number; color: string }> = {
  early: { angle: 0, color: "#38bdf8" },
  mid: { angle: 90, color: "#22c55e" },
  late: { angle: 180, color: "#f59e0b" },
  recession: { angle: 270, color: "#a78bfa" },
};

/** Color for a 0-100 score where high = hot/urgent. */
export function heatColor(score: number): string {
  if (score >= 75) return "#ef4444";
  if (score >= 60) return "#f59e0b";
  if (score >= 45) return "#22c55e";
  if (score >= 30) return "#38bdf8";
  return "#71717a";
}

export function exitColor(score: number): string {
  if (score >= 65) return "#ef4444";
  if (score >= 45) return "#f59e0b";
  if (score >= 25) return "#22c55e";
  return "#38bdf8";
}

export const fmtPct = (x: number, dp = 1): string =>
  `${x >= 0 ? "+" : ""}${x.toFixed(dp)}%`;

export const fmtNum = (x: number): string => {
  if (x >= 1e9) return `${(x / 1e9).toFixed(1)}B`;
  if (x >= 1e6) return `${(x / 1e6).toFixed(1)}M`;
  if (x >= 1e3) return `${(x / 1e3).toFixed(1)}K`;
  return `${Math.round(x)}`;
};
