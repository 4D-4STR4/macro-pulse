// Core domain types for MacroPulse.
// Everything the engine consumes is normalized into these shapes, so any data
// provider (bundled snapshot, LunarCrush, or a future feed) is interchangeable.

/** A single day of history for one sector. */
export interface SectorHistoryPoint {
  date: string; // ISO date (YYYY-MM-DD)
  price: number; // sector ETF close
  /** Share of total market social volume, 0-100. */
  socialDominance: number;
  /** Bullishness of the conversation, 0-100. */
  sentiment: number;
  /** Raw engagement volume (posts, likes, comments). */
  interactions: number;
  /** LunarCrush-style composite of price + social health, 0-100. */
  galaxyScore: number;
}

/** Point-in-time cross-sectional snapshot for one sector. */
export interface SectorSnapshot {
  id: string; // 'technology'
  name: string; // 'Technology'
  etf: string; // 'XLK'
  description: string; // what the sector represents / its current narrative

  // --- price / momentum ---
  price: number;
  ret1d: number; // % return
  ret1w: number;
  ret1m: number;
  ret3m: number;
  retYtd: number;

  // --- relative strength vs benchmark (e.g. SPY) ---
  rs1m: number; // sector ret1m minus benchmark ret1m (percentage points)
  rs3m: number;

  // --- social ---
  galaxyScore: number; // 0-100
  altRank: number; // 1 = best (lower is better)
  socialDominance: number; // 0-100, share of total social volume
  sentiment: number; // 0-100
  interactions: number; // engagement volume

  // --- breadth ---
  breadth: number; // % of constituents above their 50-day MA, 0-100

  // --- a few representative leaders for color ---
  leaders: string[];

  // --- ~90 days of daily history ---
  history: SectorHistoryPoint[];
}

/** The dataset a provider hands back. */
export interface MarketSnapshot {
  asOf: string; // ISO timestamp
  benchmark: string; // 'SPY'
  benchmarkRet1m: number;
  benchmarkRet3m: number;
  source: "snapshot" | "lunarcrush";
  note?: string;
  sectors: SectorSnapshot[];
}

// --- Engine output types -----------------------------------------------------

export type WavePhase =
  | "emerging" // accumulation — early, best entry
  | "momentum" // markup — ride it
  | "climax" // euphoria / blow-off — caution
  | "distribution" // topping — exit
  | "decline"; // markdown — avoid

export interface ScoreComponent {
  key: string;
  label: string;
  /** Normalized 0-100 contribution. */
  value: number;
  /** Weight applied in the composite (0-1). */
  weight: number;
  /** Short human explanation of the raw reading. */
  detail: string;
}

export interface ExitTrigger {
  key: string;
  label: string;
  /** Points this trigger adds to the exit score (0-100 scale, additive then clamped). */
  points: number;
  fired: boolean;
  detail: string;
}

export interface SectorAnalysis {
  sector: SectorSnapshot;

  /** 0-100 composite of how "hot" the sector is right now. */
  heatScore: number;
  heatRank: number; // 1 = hottest
  heatComponents: ScoreComponent[];

  /** Where the sector sits in the wave lifecycle. */
  phase: WavePhase;
  phaseConfidence: number; // 0-100
  phaseRationale: string;

  /** 0-100 — higher means "time to hop off". */
  exitScore: number;
  exitTriggers: ExitTrigger[];
  /** A plain-language verdict derived from phase + exit score. */
  verdict: string;

  /** 0-100 — attractiveness as a destination for rotating capital. */
  inflowScore: number;

  /** Internal trend readings, surfaced for charts / transparency. */
  trends: {
    priceSlope: number; // normalized recent price slope
    socialSlope: number; // normalized recent social-dominance slope
    interactionsSlope: number;
    divergence: number; // price slope minus social slope (bearish if >0 at top)
    socialPeakRolloff: number; // how far below its recent social peak (0-1)
  };
}

export type CycleStage = "early" | "mid" | "late" | "recession";

export interface CycleRead {
  stage: CycleStage;
  confidence: number; // 0-100
  label: string;
  description: string;
  /** Sectors that classically lead this stage. */
  leadsNow: string[];
  /** Sectors that classically lead the NEXT stage (rotation destinations). */
  rotatesToward: string[];
  nextStage: CycleStage;
}

export interface RotationEdge {
  fromId: string;
  toId: string;
  /** 0-100 strength of the predicted rotation. */
  strength: number;
  rationale: string;
}

export interface MarketAnalysis {
  asOf: string;
  source: MarketSnapshot["source"];
  note?: string;
  benchmark: string;

  hottest: SectorAnalysis; // the current leading wave
  sectors: SectorAnalysis[]; // all, sorted by heat desc

  /** Predicted next destinations for capital (sorted by score). */
  nextWave: SectorAnalysis[];
  /** Sectors flashing exit / distribution (sorted by exit score). */
  exiting: SectorAnalysis[];

  cycle: CycleRead;
  rotations: RotationEdge[]; // directional flow edges for the rotation map
}
