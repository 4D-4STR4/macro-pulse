// MacroPulse snapshot generator.
//
// Produces data/snapshot.json: a real-CONTEXT, internally-consistent dataset
// the app ships with so it runs end-to-end with zero config. The scenario
// parameters below encode the actual late-June-2026 market picture gathered
// from public sources:
//
//   - Energy is the leading wave (RS #1, up big YTD) — strong momentum, the
//     crowd arriving, exit risk beginning to build.
//   - Technology already had its run (huge trailing strength) and is now
//     DISTRIBUTING — price stalling while the conversation rolls off its peak.
//   - Industrials / Communication Services riding healthy momentum.
//   - Healthcare, Materials (copper) and Staples are EMERGING — the rotation
//     destinations as the cycle turns late.
//   - Consumer Discretionary and Real Estate are the laggards in decline.
//
// Every number here is derived from a generated price/attention PATH so the
// returns, slopes, divergences and phases are mutually consistent — this is
// synthetic-but-faithful seed data, replaced wholesale the moment a
// LUNARCRUSH_API_KEY is supplied.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const DAYS = 90;
const AS_OF = "2026-06-23T13:00:00.000Z";

// --- deterministic PRNG (mulberry32) so the snapshot is reproducible ---------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const clamp = (x, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
const pct = (a, b) => (b ? ((a - b) / b) * 100 : 0);

// Instantaneous daily price drift (% / day) by lifecycle phase, u in [0,1].
function priceDrift(phase, u) {
  switch (phase) {
    case "emerging": // base, then accelerate up in the back third
      return -0.03 + 0.34 * smooth((u - 0.45) / 0.55);
    case "momentum": // steady markup, gently strengthening
      return 0.1 + 0.08 * u;
    case "climax": // parabolic, then flattening hard at the very top
      return u < 0.85 ? 0.06 + 0.3 * u : 0.32 * (1 - (u - 0.85) / 0.15);
    case "distribution": // big run, then STALLS flat at the highs (not a crash)
      return 0.2 - 0.19 * smooth((u - 0.22) / 0.62);
    case "decline": // persistent markdown
      return -0.06 - 0.05 * u;
    default:
      return 0;
  }
}

// Attention / social-dominance shape (relative multiplier ~0.5..2.0).
function socialShape(phase, u) {
  switch (phase) {
    case "emerging": // discovery — rising hard off a low base
      return 0.55 + 1.05 * smooth(u);
    case "momentum": // rising with price
      return 0.75 + 0.6 * u;
    case "climax": // blow-off spike near the top
      return 0.7 + 1.4 * smooth((u - 0.4) / 0.6);
    case "distribution": {
      // peaks mid-wave then fades while still elevated — the bearish divergence
      // tell: the crowd is leaving but hasn't fully gone yet.
      const peak = Math.exp(-(((u - 0.5) / 0.22) ** 2));
      return 0.7 + 0.9 * peak - 0.15 * smooth((u - 0.55) / 0.45);
    }
    case "decline":
      return 1.0 - 0.55 * smooth(u);
    default:
      return 1;
  }
}

// Sentiment path (0-100) by phase.
function sentimentPath(phase, u) {
  switch (phase) {
    case "emerging":
      return 49 + 15 * smooth(u);
    case "momentum":
      return 60 + 11 * u;
    case "climax":
      return 70 + 19 * smooth(u);
    case "distribution": // crowd still euphoric even as price stalls — the top
      return 82 - 9 * smooth((u - 0.45) / 0.55);
    case "decline":
      return 46 - 9 * smooth(u);
    default:
      return 50;
  }
}

// --- the sector universe + its current-cycle scenario ------------------------
// id/name/etf/description/leaders mirror lib/data/sectors.ts (the live-provider
// source of truth); the scenario fields drive this seed only.
const SECTORS = [
  { id: "energy", name: "Energy", etf: "XLE",
    description: "Integrated oil & gas, E&P and services — the inflation / late-cycle trade.",
    leaders: ["XOM", "CVX", "COP", "SLB"],
    phase: "momentum", p0: 92, mag: 1.35, social: 9.4, pop: 1.15, breadth: 74, seed: 11 },

  { id: "technology", name: "Technology", etf: "XLK",
    description: "Semiconductors, software and AI infrastructure — the secular growth engine.",
    leaders: ["NVDA", "MSFT", "AAPL", "AVGO"],
    phase: "distribution", p0: 168, mag: 1.7, social: 13.5, pop: 1.6, breadth: 41, seed: 22 },

  { id: "industrials", name: "Industrials", etf: "XLI",
    description: "Capital goods, defense and transports — capex, reshoring and data-center build.",
    leaders: ["CAT", "GE", "HON", "UBER"],
    phase: "momentum", p0: 138, mag: 1.05, social: 5.2, pop: 0.8, breadth: 71, seed: 33 },

  { id: "communication-services", name: "Communication Services", etf: "XLC",
    description: "Mega-cap internet, media and telecom — ad cycles plus AI optionality.",
    leaders: ["META", "GOOGL", "NFLX", "DIS"],
    phase: "momentum", p0: 104, mag: 1.0, social: 7.8, pop: 1.2, breadth: 64, seed: 44 },

  { id: "financial-services", name: "Financials", etf: "XLF",
    description: "Banks, insurers and exchanges — geared to rates, credit and the cycle.",
    leaders: ["JPM", "BRK.B", "V", "MA"],
    phase: "momentum", p0: 48, mag: 0.78, social: 6.1, pop: 0.9, breadth: 66, seed: 55 },

  { id: "healthcare", name: "Healthcare", etf: "XLV",
    description: "Pharma, biotech and devices — defensive growth with GLP-1 leadership.",
    leaders: ["LLY", "UNH", "JNJ", "ABBV"],
    phase: "emerging", p0: 142, mag: 0.7, social: 6.6, pop: 1.0, breadth: 62, seed: 66 },

  { id: "basic-materials", name: "Materials", etf: "XLB",
    description: "Miners, chemicals and metals — copper and the electrification trade.",
    leaders: ["LIN", "FCX", "SHW", "NEM"],
    phase: "emerging", p0: 88, mag: 0.82, social: 4.3, pop: 0.7, breadth: 64, seed: 77 },

  { id: "consumer-defensive", name: "Consumer Staples", etf: "XLP",
    description: "Food, beverage and household staples — the classic risk-off ballast.",
    leaders: ["WMT", "COST", "PG", "KO"],
    phase: "emerging", p0: 80, mag: 0.5, social: 3.6, pop: 0.6, breadth: 60, seed: 88 },

  { id: "utilities", name: "Utilities", etf: "XLU",
    description: "Regulated power — bond-proxy defensives, now an AI-power demand story.",
    leaders: ["NEE", "SO", "DUK", "CEG"],
    phase: "emerging", p0: 78, mag: 0.55, social: 3.1, pop: 0.55, breadth: 58, seed: 99 },

  { id: "consumer-cyclical", name: "Consumer Discretionary", etf: "XLY",
    description: "Retail, autos and travel — geared to the health of the consumer.",
    leaders: ["AMZN", "TSLA", "HD", "MCD"],
    phase: "decline", p0: 196, mag: 1.0, social: 6.9, pop: 1.05, breadth: 38, seed: 111 },

  { id: "real-estate", name: "Real Estate", etf: "XLRE",
    description: "REITs — rate-sensitive yield, levered to the direction of long bonds.",
    leaders: ["PLD", "AMT", "EQIX", "WELL"],
    phase: "decline", p0: 40, mag: 0.85, social: 2.4, pop: 0.5, breadth: 32, seed: 123 },
];

function buildSeries(cfg) {
  const rnd = mulberry32(cfg.seed);
  const price = [];
  const social = [];
  const sentiment = [];
  const interactions = [];

  let p = cfg.p0;
  for (let i = 0; i < DAYS; i++) {
    const u = i / (DAYS - 1);
    const drift = priceDrift(cfg.phase, u) * cfg.mag;
    const noise = (rnd() - 0.5) * 0.9; // daily noise, ±0.45%/day
    p = p * (1 + (drift + noise) / 100);
    price.push(p);

    const sd = cfg.social * socialShape(cfg.phase, u) * (0.92 + 0.16 * rnd());
    social.push(sd);
    sentiment.push(clamp(sentimentPath(cfg.phase, u) + (rnd() - 0.5) * 4, 1, 99));
    interactions.push(Math.round(sd * cfg.pop * 1_000_000 * (0.85 + 0.3 * rnd())));
  }

  // galaxy score per day: blend of recent price thrust, attention and sentiment
  const galaxy = price.map((_, i) => {
    const thrust = i >= 5 ? pct(price[i], price[i - 5]) : 0;
    const socAvg = social.reduce((a, b) => a + b, 0) / social.length;
    return clamp(
      50 + 3.2 * thrust + (social[i] - socAvg) * 2.1 + (sentiment[i] - 50) * 0.35,
      1,
      100
    );
  });

  const history = price.map((_, i) => ({
    date: dayISO(i),
    price: round(price[i], 2),
    socialDominance: round(social[i], 2),
    sentiment: round(sentiment[i], 1),
    interactions: interactions[i],
    galaxyScore: round(galaxy[i], 1),
  }));

  return { price, social, sentiment, interactions, galaxy, history };
}

function dayISO(i) {
  const end = new Date(AS_OF);
  const d = new Date(end.getTime() - (DAYS - 1 - i) * 86400000);
  return d.toISOString().slice(0, 10);
}

const round = (x, dp = 2) => {
  const f = 10 ** dp;
  return Math.round(x * f) / f;
};
const tr = (arr, lb) => pct(arr[arr.length - 1], arr[Math.max(0, arr.length - 1 - lb)]);

// --- benchmark (SPY): mild broad-market uptrend ------------------------------
function buildBenchmark() {
  const rnd = mulberry32(7);
  let p = 600;
  const price = [];
  for (let i = 0; i < DAYS; i++) {
    const u = i / (DAYS - 1);
    const drift = (0.045 + 0.02 * u) + (rnd() - 0.5) * 0.6;
    p = p * (1 + drift / 100);
    price.push(p);
  }
  return price;
}

// --- themes (cross-cutting narratives, scored like sectors) ------------------
// Real-context late-June-2026 read: the AI buildout (compute, optical, power,
// nuclear, memory) is hot; quantum/semis stretched; GLP-1 and crypto cooling;
// EV in decline. etf is "" (themes are baskets, not a single ETF).
const THEME_SCENARIOS = [
  { id: "ai-infrastructure", name: "AI Infrastructure", phase: "momentum", p0: 140, mag: 1.5, social: 14, pop: 1.8, breadth: 76, seed: 211,
    description: "Compute/networking buildout behind AI.", leaders: ["NVDA", "AVGO", "ANET", "VRT"] },
  { id: "datacenter-power", name: "Datacenter Power", phase: "momentum", p0: 120, mag: 1.35, social: 8, pop: 1.1, breadth: 73, seed: 212,
    description: "Electrification & power for AI datacenters.", leaders: ["VST", "CEG", "GEV", "ETN"] },
  { id: "optical-networking", name: "Optical / Networking", phase: "momentum", p0: 95, mag: 1.6, social: 7, pop: 1.0, breadth: 72, seed: 213,
    description: "Optical interconnect & datacenter networking.", leaders: ["CIEN", "COHR", "NOK", "ANET"] },
  { id: "nuclear-uranium", name: "Nuclear / Uranium", phase: "momentum", p0: 60, mag: 1.7, social: 9, pop: 1.0, breadth: 70, seed: 214,
    description: "Nuclear revival & uranium for AI-era demand.", leaders: ["CEG", "OKLO", "CCJ", "SMR"] },
  { id: "memory", name: "Memory", phase: "momentum", p0: 110, mag: 1.5, social: 5, pop: 0.8, breadth: 71, seed: 215,
    description: "DRAM/NAND & HBM supercycle.", leaders: ["MU", "WDC", "STX", "SNDK"] },
  { id: "semiconductors", name: "Semiconductors", phase: "climax", p0: 180, mag: 1.4, social: 12, pop: 1.5, breadth: 60, seed: 216,
    description: "The chip cycle — logic, foundry, equipment.", leaders: ["NVDA", "AMD", "AVGO", "TSM"] },
  { id: "quantum", name: "Quantum Computing", phase: "climax", p0: 40, mag: 2.2, social: 8, pop: 0.8, breadth: 50, seed: 217,
    description: "Quantum hardware — speculative, narrative-driven.", leaders: ["IONQ", "RGTI", "QBTS", "QUBT"] },
  { id: "defense", name: "Defense", phase: "momentum", p0: 150, mag: 1.0, social: 6, pop: 0.9, breadth: 70, seed: 218,
    description: "Defense primes & tech — elevated spending.", leaders: ["LMT", "RTX", "PLTR", "GD"] },
  { id: "cybersecurity", name: "Cybersecurity", phase: "momentum", p0: 130, mag: 0.9, social: 6, pop: 1.0, breadth: 66, seed: 219,
    description: "Security software consolidation.", leaders: ["PANW", "CRWD", "FTNT", "ZS"] },
  { id: "copper-electrification", name: "Copper / Electrification", phase: "emerging", p0: 85, mag: 0.95, social: 4, pop: 0.7, breadth: 64, seed: 220,
    description: "Copper & electrification — grid/EV/AI demand.", leaders: ["FCX", "SCCO", "ETN", "TECK"] },
  { id: "robotics-automation", name: "Robotics / Automation", phase: "emerging", p0: 100, mag: 0.85, social: 5, pop: 0.8, breadth: 60, seed: 221,
    description: "Automation, humanoids, surgical robotics.", leaders: ["ISRG", "TSLA", "ROK", "SYM"] },
  { id: "space", name: "Space", phase: "emerging", p0: 70, mag: 1.1, social: 5, pop: 0.8, breadth: 58, seed: 222,
    description: "Launch, satellites & space infrastructure.", leaders: ["RKLB", "ASTS", "LUNR", "RTX"] },
  { id: "glp1-obesity", name: "GLP-1 / Obesity", phase: "distribution", p0: 160, mag: 1.3, social: 9, pop: 1.2, breadth: 42, seed: 223,
    description: "GLP-1 weight-loss & metabolic drugs.", leaders: ["LLY", "NVO", "VKTX", "AMGN"] },
  { id: "crypto-blockchain", name: "Crypto / Blockchain", phase: "distribution", p0: 120, mag: 1.8, social: 10, pop: 1.3, breadth: 40, seed: 224,
    description: "Crypto-levered equities — exchanges, miners.", leaders: ["COIN", "MSTR", "MARA", "HOOD"] },
  { id: "ev-battery", name: "EV / Battery", phase: "decline", p0: 110, mag: 1.1, social: 6, pop: 1.0, breadth: 34, seed: 225,
    description: "Electric vehicles & batteries.", leaders: ["TSLA", "RIVN", "LCID", "QS"] },
].map((t) => ({ ...t, etf: "" }));

/** Build one snapshot entry (sector or theme) from its scenario config. */
function buildEntry(cfg, bRet1m, bRet3m) {
  const s = buildSeries(cfg);
  const price = s.price;
  const ret1m = tr(price, 21);
  const ret3m = tr(price, 63);
  return {
    cfg,
    series: s,
    snap: {
      id: cfg.id,
      name: cfg.name,
      etf: cfg.etf,
      description: cfg.description,
      leaders: cfg.leaders,
      price: round(price[price.length - 1], 2),
      ret1d: round(tr(price, 1), 2),
      ret1w: round(tr(price, 5), 2),
      ret1m: round(ret1m, 2),
      ret3m: round(ret3m, 2),
      retYtd: round(tr(price, DAYS - 1), 2),
      rs1m: round(ret1m - bRet1m, 2),
      rs3m: round(ret3m - bRet3m, 2),
      galaxyScore: round(s.galaxy[s.galaxy.length - 1], 1),
      altRank: 0, // filled after ranking
      socialDominance: round(s.social[s.social.length - 1], 2),
      sentiment: round(s.sentiment[s.sentiment.length - 1], 1),
      interactions: s.interactions[s.interactions.length - 1],
      breadth: cfg.breadth,
      history: s.history,
    },
  };
}

/** AltRank within a group by galaxy score (1 = best). */
function rankAlt(entries) {
  [...entries].sort((a, b) => b.snap.galaxyScore - a.snap.galaxyScore).forEach((b, i) => (b.snap.altRank = i + 1));
}

function main() {
  const bench = buildBenchmark();
  const bRet1m = tr(bench, 21);
  const bRet3m = tr(bench, 63);

  // First pass: build each sector's series + snapshot scalars.
  const built = SECTORS.map((cfg) => buildEntry(cfg, bRet1m, bRet3m));
  rankAlt(built);
  const builtThemes = THEME_SCENARIOS.map((cfg) => buildEntry(cfg, bRet1m, bRet3m));
  rankAlt(builtThemes);

  const snapshot = {
    asOf: AS_OF,
    benchmark: "SPY",
    benchmarkRet1m: round(bRet1m, 2),
    benchmarkRet3m: round(bRet3m, 2),
    benchmarkHistory: bench.map((p) => round(p, 2)),
    source: "snapshot",
    note:
      "Real-context seed snapshot (late June 2026). Synthetic-but-faithful sector paths; " +
      "replaced by live data when LUNARCRUSH_API_KEY is set.",
    sectors: built.map((b) => b.snap),
    themes: builtThemes.map((b) => b.snap),
  };

  const outDir = join(ROOT, "data");
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, "snapshot.json");
  writeFileSync(out, JSON.stringify(snapshot, null, 2));

  // brief console summary
  const summary = built
    .map((b) => `${b.snap.etf.padEnd(5)} ${b.cfg.phase.padEnd(13)} 3m ${String(b.snap.ret3m).padStart(6)}%  soc ${b.snap.socialDominance}`)
    .join("\n");
  const themeSummary = builtThemes
    .map((b) => `${b.snap.id.padEnd(24)} ${b.cfg.phase.padEnd(13)} 3m ${String(b.snap.ret3m).padStart(6)}%  soc ${b.snap.socialDominance}`)
    .join("\n");
  console.log(`Wrote ${out}\nSECTORS:\n${summary}\nTHEMES:\n${themeSummary}`);
}

main();
