import type { MarketAnalysis, SectorAnalysis, WavePhase, SignalDirection } from "@/lib/types";
import type { ClassifyResult } from "@/lib/data/classifyTicker";
import { clamp, round, mean, tail, normalizedSlope } from "./util";

/**
 * The Ticker Map.
 *
 * Given a ticker, produce an honest "map" that keeps THREE things separate and
 * never conflates them:
 *
 *   1. Classification — which sector the stock is in (or an explicit "unknown").
 *   2. Sector context — the sector's role in the rotation (Hot / Rotate-in /
 *      Avoid / Neutral), read straight from the same engine the app trusts.
 *   3. The stock's OWN score — its individual technical strength from its own
 *      price action, computed only when live data exists (never fabricated).
 *
 * A combined read fuses (2) and (3) with explicit logic, and a confidence that
 * falls when data is thin or the sector's own signals are mixed. The guiding
 * rule is "signal, not misleading information": when we don't know, we say so.
 */

export type SectorRole = "leader" | "rotate-in" | "avoid" | "neutral";

const PHASE_WORD: Record<WavePhase, string> = {
  emerging: "emerging",
  momentum: "in momentum",
  climax: "climaxing",
  distribution: "distributing",
  decline: "declining",
};

export interface StockFactor {
  key: string;
  label: string;
  value: number; // 0-100
  weight: number; // 0-1
  detail: string;
}

export interface StockScore {
  score: number; // 0-100, the stock's own technical strength
  trend: "uptrend" | "range" | "downtrend";
  factors: StockFactor[];
  stats: {
    price: number;
    ret1w: number;
    ret1m: number;
    ret3m: number;
    rs1m: number | null; // vs benchmark; null if benchmark unavailable
    rs3m: number | null;
    pctFromHigh: number; // <= 0
  };
}

export interface SectorContext {
  id: string;
  name: string;
  etf: string;
  heatScore: number;
  heatRank: number;
  totalSectors: number;
  phase: WavePhase;
  exitScore: number;
  inflowScore: number;
  conviction: { score: number; direction: SignalDirection };
  verdict: string;
}

export interface TickerMap {
  symbol: string;
  found: boolean;
  name?: string;
  classification?: { sectorId: string; sectorName: string; sectorEtf: string };

  role: SectorRole | "unknown";
  roleLabel: string;
  roleReason: string;

  /** How the sector was determined (transparency). */
  via: "curated" | "live" | "none";
  classificationSource?: "fmp" | "yahoo";
  fund?: boolean;

  sector?: SectorContext;
  stock?: StockScore;
  stockDataAvailable: boolean;

  combined: {
    headline: string;
    reasoning: string[];
    confidence: number; // 0-100
    confidenceLabel: "High" | "Moderate" | "Low";
  };
  caveats: string[];
  dataSource: MarketAnalysis["source"];
  asOf: string;
  coverage: number;
}

const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);
const trailing = (p: number[], lb: number) =>
  p.length < 2 ? 0 : pct(p[p.length - 1], p[Math.max(0, p.length - 1 - lb)]);

// --- stock's own technical score ---------------------------------------------

export interface StockSeries {
  close: number[];
  volume?: number[];
}

export function computeStockScore(series: StockSeries, bench?: number[]): StockScore {
  const P = series.close;
  const last = P[P.length - 1];
  const ret1w = trailing(P, 5);
  const ret1m = trailing(P, 21);
  const ret3m = trailing(P, 63);

  const hasBench = !!bench && bench.length > 21;
  const rs1m = hasBench ? round(ret1m - trailing(bench!, 21)) : null;
  const rs3m = hasBench ? round(ret3m - trailing(bench!, 63)) : null;

  const ma50 = mean(tail(P, 50));
  const aboveMA = last >= ma50;
  const slope20 = normalizedSlope(tail(P, 20));
  const high90 = Math.max(...tail(P, 90));
  const pctFromHigh = round(pct(last, high90)); // <= 0

  // Each sub-score is 0-100 with a documented formula.
  const trend = clamp(50 + slope20 * 7 + (aboveMA ? 15 : -18));
  const blendedMom = 0.5 * ret1w + 0.3 * ret1m + 0.2 * (ret3m / 3);
  const momentum = clamp(50 + blendedMom * 3);
  // Position: near the 90d high is strong; penalize parabolic extension.
  let position = clamp(100 + pctFromHigh * 2.2);
  if (ret1m > 30) position = clamp(position - (ret1m - 30) * 0.8);
  const relStrength = hasBench
    ? clamp(50 + (0.6 * (rs1m ?? 0) + 0.4 * (rs3m ?? 0)) * 3)
    : 50;

  // Weights — renormalized if there's no benchmark for relative strength.
  const baseW = { trend: 0.3, rel: 0.3, momentum: 0.2, position: 0.2 };
  const factors: StockFactor[] = [];
  const w = hasBench
    ? baseW
    : { trend: 0.43, rel: 0, momentum: 0.28, position: 0.29 };

  factors.push({
    key: "trend",
    label: "Trend",
    value: round(trend),
    weight: w.trend,
    detail: `${aboveMA ? "Above" : "below"} 50-day MA, slope ${slope20 >= 0 ? "rising" : "falling"}`,
  });
  if (hasBench) {
    factors.push({
      key: "rel",
      label: "Relative strength",
      value: round(relStrength),
      weight: w.rel,
      detail: `${fmt(rs1m ?? 0)} vs SPY (1m) · ${fmt(rs3m ?? 0)} (3m)`,
    });
  }
  factors.push({
    key: "momentum",
    label: "Momentum",
    value: round(momentum),
    weight: w.momentum,
    detail: `1w ${fmt(ret1w)} · 1m ${fmt(ret1m)} · 3m ${fmt(ret3m)}`,
  });
  factors.push({
    key: "position",
    label: "Position",
    value: round(position),
    weight: w.position,
    detail: `${fmt(pctFromHigh)} from 90-day high${ret1m > 30 ? " · extended" : ""}`,
  });

  const score = round(clamp(factors.reduce((a, f) => a + f.value * f.weight, 0)));

  const trendLabel: StockScore["trend"] =
    slope20 > 0.08 && aboveMA ? "uptrend" : slope20 < -0.05 || !aboveMA ? "downtrend" : "range";

  return {
    score,
    trend: trendLabel,
    factors,
    stats: {
      price: round(last, 2),
      ret1w: round(ret1w),
      ret1m: round(ret1m),
      ret3m: round(ret3m),
      rs1m,
      rs3m,
      pctFromHigh,
    },
  };
}

// --- sector role (reuses the engine's already-reasoned analysis) -------------

function sectorRole(sa: SectorAnalysis, analysis: MarketAnalysis): { role: SectorRole; reason: string } {
  const inExiting =
    analysis.exiting.some((e) => e.sector.id === sa.sector.id) ||
    sa.phase === "distribution" ||
    sa.phase === "decline" ||
    sa.exitScore >= 50;
  const inNext =
    analysis.nextWave.some((n) => n.sector.id === sa.sector.id) ||
    (sa.phase === "emerging" && sa.inflowScore >= 58);
  const isLeader =
    sa.heatRank <= 3 && (sa.phase === "momentum" || sa.phase === "climax" || sa.phase === "emerging");

  // Precedence: risk first (avoid), then opportunity (rotate-in), then leadership.
  if (inExiting) {
    return {
      role: "avoid",
      reason: `${sa.sector.name} is ${PHASE_WORD[sa.phase]} with an exit signal of ${sa.exitScore}/100 — capital is rotating OUT.`,
    };
  }
  if (inNext) {
    return {
      role: "rotate-in",
      reason: `${sa.sector.name} is an emerging rotation target (inflow ${sa.inflowScore}/100) — capital is starting to flow in.`,
    };
  }
  if (isLeader) {
    return {
      role: "leader",
      reason: `${sa.sector.name} is a current leader — #${sa.heatRank} by heat (${sa.heatScore}/100), ${PHASE_WORD[sa.phase]}.`,
    };
  }
  return {
    role: "neutral",
    reason: `${sa.sector.name} is mid-pack — #${sa.heatRank} by heat, ${PHASE_WORD[sa.phase]}, neither leading nor exhausted.`,
  };
}

const ROLE_LABEL: Record<SectorRole, string> = {
  leader: "Hot now",
  "rotate-in": "Rotate in",
  avoid: "Avoid / rotate out",
  neutral: "Neutral",
};

/** The 2×2 logic: stock strength × sector role → explicit guidance. */
function alignmentNote(role: SectorRole, strength: "strong" | "average" | "weak" | null): string {
  if (strength === null) {
    // Sector-only read.
    switch (role) {
      case "avoid":
        return "Sector context only (no live stock data): the sector is one to be cautious on — demand a strong individual setup before fighting it.";
      case "rotate-in":
        return "Sector context only (no live stock data): the sector is a building tailwind — leaders here have the wind at their back.";
      case "leader":
        return "Sector context only (no live stock data): the sector is leading — favor relative-strength names within it.";
      default:
        return "Sector context only (no live stock data): the sector is neutral — the stock-specific setup matters more than the sector here.";
    }
  }
  const k = `${strength}|${role}`;
  const map: Record<string, string> = {
    "strong|leader": "Strong stock in a leading sector — the highest-quality alignment. Trend and tailwind agree.",
    "strong|rotate-in": "Strong stock in an emerging sector — early leadership in a building wave; often the best risk/reward.",
    "strong|avoid": "Strong stock in a topping sector — the rising tide is going out. Sector risk caps the setup; mind the sector's exit signal.",
    "strong|neutral": "Strong stock carrying a neutral sector — this is a stock-specific story, not a sector tailwind.",
    "average|leader": "Average stock in a leading sector — the sector is the tailwind; prefer the sector's relative-strength leaders over this one.",
    "average|rotate-in": "Average stock in an emerging sector — the wave may lift it, but stronger names in the sector are cleaner.",
    "average|avoid": "Average stock in a topping sector — little to like on either axis right now; stand aside.",
    "average|neutral": "Average stock, neutral sector — no edge on either axis. Skip until something improves.",
    "weak|leader": "Weak stock in a leading sector — a laggard while peers run; the sector is hot but this name isn't participating.",
    "weak|rotate-in": "Weak stock in an emerging sector — not yet confirming the rotation; wait for it to turn up.",
    "weak|avoid": "Weak stock in a topping sector — both axes negative. Highest-risk combination; avoid.",
    "weak|neutral": "Weak stock in a neutral sector — nothing supporting it. Avoid.",
  };
  return map[k];
}

export function mapTicker(
  result: ClassifyResult,
  rawSymbol: string,
  analysis: MarketAnalysis,
  coverage: number,
  opts?: { stock?: StockScore },
): TickerMap {
  const classification = result.classification;
  const stock = opts?.stock;
  const baseCaveats = [
    "Sector classification is GICS-based; verify for multi-segment or recently reclassified companies.",
    "Research only — not investment advice.",
  ];
  const symbol = (classification?.symbol ?? rawSymbol).toUpperCase();

  // --- no sector classification ---
  if (!classification) {
    // If we at least have the stock's own price, still give a useful read.
    if (stock) {
      const conf = round(clamp(40 + Math.abs(stock.score - 50) * 0.5));
      return {
        symbol,
        found: false,
        name: result.name,
        via: result.via,
        classificationSource: result.source,
        fund: result.fund,
        role: "unknown",
        roleLabel: result.fund ? "Fund / ETF" : "Sector unclassified",
        roleReason: result.fund
          ? "This is a fund/ETF/index, not a single-sector equity — no sector-rotation role applies."
          : "We couldn't place this symbol in one of the 11 sectors, so we show its own price score without a sector role.",
        stock,
        stockDataAvailable: true,
        combined: {
          headline: `${result.name ?? symbol} — ${result.fund ? "fund/ETF" : "sector unclassified"}; showing the stock's own score.`,
          reasoning: [
            `Stock: ${symbol}'s own technical score is ${stock.score}/100 (${stock.trend}) — 1m ${fmt(stock.stats.ret1m)}, ${stock.stats.rs1m !== null ? `${fmt(stock.stats.rs1m)} vs SPY (1m), ` : ""}${fmt(stock.stats.pctFromHigh)} from its 90-day high.`,
            result.fund
              ? "No single sector applies to a fund/ETF, so there's no rotation role — use the dashboard for sector-level rotation."
              : "We won't assign a sector we can't confirm, so there's no sector-rotation context for this name.",
          ],
          confidence: conf,
          confidenceLabel: conf >= 66 ? "High" : conf >= 40 ? "Moderate" : "Low",
        },
        caveats: ["Sector context omitted — only the stock's own price action is scored.", ...baseCaveats],
        dataSource: analysis.source,
        asOf: analysis.asOf,
        coverage,
      };
    }
    // Nothing at all: refuse to guess.
    return {
      symbol,
      found: false,
      name: result.name,
      via: result.via,
      classificationSource: result.source,
      fund: result.fund,
      role: "unknown",
      roleLabel: "Unclassified",
      roleReason: "We don't have a confident sector classification for this symbol, so we won't guess.",
      stockDataAvailable: false,
      combined: {
        headline: `No confident classification for ${symbol}`,
        reasoning: [
          result.fund
            ? "This looks like a fund/ETF/index, not a single-sector equity."
            : "We couldn't classify this symbol (it may be a non-US listing, crypto, or a name our live lookup couldn't resolve), and live price data wasn't reachable either.",
          "Rather than assign a sector that could mislead you, we leave it unclassified. Try a US-listed ticker, or check the sector board directly.",
        ],
        confidence: 0,
        confidenceLabel: "Low",
      },
      caveats: baseCaveats,
      dataSource: analysis.source,
      asOf: analysis.asOf,
      coverage,
    };
  }

  const sa = analysis.sectors.find((s) => s.sector.id === classification.sectorId)!;
  const { role, reason } = sectorRole(sa, analysis);
  const stockDataAvailable = !!stock;

  const sector: SectorContext = {
    id: sa.sector.id,
    name: sa.sector.name,
    etf: sa.sector.etf,
    heatScore: sa.heatScore,
    heatRank: sa.heatRank,
    totalSectors: analysis.sectors.length,
    phase: sa.phase,
    exitScore: sa.exitScore,
    inflowScore: sa.inflowScore,
    conviction: { score: sa.conviction.score, direction: sa.conviction.direction },
    verdict: sa.verdict,
  };

  const strength: "strong" | "average" | "weak" | null = stock
    ? stock.score >= 62
      ? "strong"
      : stock.score <= 42
        ? "weak"
        : "average"
    : null;

  // --- confidence: data availability + sector conviction + source quality ---
  let confidence = 50;
  // Sector conviction supports the read when it agrees with the role's posture.
  const roleBullish = role === "leader" || role === "rotate-in";
  const convAgrees =
    (roleBullish && sa.conviction.direction === "bullish") ||
    (role === "avoid" && sa.conviction.direction === "bearish");
  confidence += (convAgrees ? 1 : -0.4) * (sa.conviction.score * 0.25);
  confidence += stockDataAvailable ? 18 : -8;
  confidence += analysis.source === "snapshot" ? -8 : analysis.source === "lunarcrush" ? 12 : 8;
  confidence = round(clamp(confidence, 10, 95));
  const confidenceLabel = confidence >= 66 ? "High" : confidence >= 40 ? "Moderate" : "Low";

  // --- headline + reasoning ---
  const strengthWord = strength ? `${cap(strength)} stock` : `${classification.name}`;
  const headline =
    role === "avoid"
      ? `${strengthWord} in ${sa.sector.name} — a sector to rotate OUT of right now.`
      : role === "rotate-in"
        ? `${strengthWord} in ${sa.sector.name} — an emerging rotation target.`
        : role === "leader"
          ? `${strengthWord} in ${sa.sector.name} — a current market leader.`
          : `${strengthWord} in ${sa.sector.name} — a neutral sector right now.`;

  const reasoning: string[] = [];
  reasoning.push(
    `Sector: ${sa.sector.name} (${sa.sector.etf}) is ${PHASE_WORD[sa.phase]} — heat ${sa.heatScore}/100 (#${sa.heatRank} of ${analysis.sectors.length}), exit ${sa.exitScore}/100, conviction ${sa.conviction.score} ${sa.conviction.direction}.`,
  );
  if (stock) {
    reasoning.push(
      `Stock: ${classification.symbol}'s own technical score is ${stock.score}/100 (${stock.trend}) — 1m ${fmt(stock.stats.ret1m)}, ${stock.stats.rs1m !== null ? `${fmt(stock.stats.rs1m)} vs SPY (1m), ` : ""}${fmt(stock.stats.pctFromHigh)} from its 90-day high.`,
    );
  } else {
    reasoning.push(
      "Stock: individual price data wasn't available, so this is sector context only — not a stock-specific score. Enable live data (MARKET_DATA_PROVIDER=stooq) to score the stock itself.",
    );
  }
  reasoning.push(alignmentNote(role, strength));

  // --- caveats ---
  const caveats = [...baseCaveats];
  if (analysis.source === "snapshot") {
    caveats.unshift(
      "Sector context is from the bundled demo snapshot (illustrative), not live market data — set MARKET_DATA_PROVIDER=stooq or a LunarCrush key for live signal.",
    );
  }
  if (sa.conviction.score < 35) {
    caveats.unshift(
      `The ${sa.sector.name} sector's own signals are mixed (conviction ${sa.conviction.score}) — treat the sector read with extra caution.`,
    );
  }
  if (!stockDataAvailable) {
    caveats.unshift(
      "No live stock price — the stock's individual score is omitted rather than estimated.",
    );
  }
  if (result.via === "live") {
    caveats.unshift(
      `Sector resolved via live lookup (${result.source === "fmp" ? "FMP" : "keyless, unofficial"}) — verify for edge cases.`,
    );
  }

  return {
    symbol: classification.symbol,
    found: true,
    name: classification.name,
    classification: {
      sectorId: classification.sectorId,
      sectorName: classification.sectorName,
      sectorEtf: classification.sectorEtf,
    },
    via: result.via,
    classificationSource: result.source,
    role,
    roleLabel: ROLE_LABEL[role],
    roleReason: reason,
    sector,
    stock,
    stockDataAvailable,
    combined: { headline, reasoning, confidence, confidenceLabel },
    caveats,
    dataSource: analysis.source,
    asOf: analysis.asOf,
    coverage,
  };
}

function fmt(x: number): string {
  return `${x >= 0 ? "+" : ""}${round(x)}%`;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
