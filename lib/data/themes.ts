/**
 * Themes — cross-cutting market narratives that don't map 1:1 to GICS sectors.
 *
 * A stock belongs to its single GICS sector but can ride several themes. Themes
 * are what actually drive many names (Nokia's GICS sector is Technology, but the
 * narrative moving it is "AI infrastructure / optical networking"). Scoring
 * themes independently of sectors is what lets the app say "soft sector, hot
 * theme" instead of a misleading blanket call.
 *
 * Curated now (works offline + deployed). The same theme ids are LunarCrush-
 * ready: when a key is added, theme heat/social can come from LunarCrush's
 * topic/sector data instead of the bundled seed.
 */
export interface ThemeDef {
  id: string;
  name: string;
  description: string;
  /** Representative constituents (tickers). Used for reverse lookup + live baskets. */
  tickers: string[];
}

export const THEMES: ThemeDef[] = [
  {
    id: "ai-infrastructure",
    name: "AI Infrastructure",
    description: "The compute/networking buildout behind AI — accelerators, servers, interconnect.",
    tickers: ["NVDA", "AVGO", "SMCI", "DELL", "ANET", "MRVL", "AMD", "MU", "TSM", "ARM", "NOK", "CRDO", "VRT"],
  },
  {
    id: "optical-networking",
    name: "Optical / Networking",
    description: "Optical interconnect and datacenter networking — the plumbing of AI clusters.",
    tickers: ["CIEN", "COHR", "LITE", "NOK", "ANET", "MRVL", "CRDO", "FN", "ALAB"],
  },
  {
    id: "datacenter-power",
    name: "Datacenter Power",
    description: "Electrification and power for AI datacenters — utilities, gear, cooling.",
    tickers: ["VST", "CEG", "GEV", "VRT", "ETN", "PWR", "NRG", "TLN", "NEE", "OKLO"],
  },
  {
    id: "nuclear-uranium",
    name: "Nuclear / Uranium",
    description: "Nuclear power revival and uranium — baseload for AI-era electricity demand.",
    tickers: ["CEG", "VST", "OKLO", "SMR", "CCJ", "LEU", "TLN", "NNE", "GEV"],
  },
  {
    id: "semiconductors",
    name: "Semiconductors",
    description: "The chip cycle — logic, foundry, equipment.",
    tickers: ["NVDA", "AMD", "AVGO", "TSM", "MU", "LRCX", "AMAT", "KLAC", "ASML", "QCOM", "ADI", "MRVL", "TXN"],
  },
  {
    id: "memory",
    name: "Memory",
    description: "DRAM/NAND and high-bandwidth memory — the HBM supercycle.",
    tickers: ["MU", "WDC", "STX", "SNDK"],
  },
  {
    id: "cybersecurity",
    name: "Cybersecurity",
    description: "Security software — platform consolidation and AI-driven threats.",
    tickers: ["PANW", "CRWD", "FTNT", "ZS", "NET", "S", "OKTA", "CYBR"],
  },
  {
    id: "glp1-obesity",
    name: "GLP-1 / Obesity",
    description: "GLP-1 weight-loss and metabolic drugs — the blockbuster pharma narrative.",
    tickers: ["LLY", "NVO", "VKTX", "AMGN", "TERN"],
  },
  {
    id: "defense",
    name: "Defense",
    description: "Defense primes and tech — elevated geopolitical spending.",
    tickers: ["LMT", "RTX", "NOC", "GD", "LHX", "BA", "HII", "PLTR", "AVAV", "KTOS"],
  },
  {
    id: "copper-electrification",
    name: "Copper / Electrification",
    description: "Copper and electrification — grid, EVs and datacenter demand.",
    tickers: ["FCX", "SCCO", "TECK", "ALB", "ETN", "NEM"],
  },
  {
    id: "quantum",
    name: "Quantum Computing",
    description: "Quantum hardware — high-beta, narrative-driven and speculative.",
    tickers: ["IONQ", "RGTI", "QBTS", "QUBT"],
  },
  {
    id: "robotics-automation",
    name: "Robotics / Automation",
    description: "Automation, humanoids and surgical robotics.",
    tickers: ["TSLA", "ISRG", "ROK", "ABB", "PATH", "SYM"],
  },
  {
    id: "space",
    name: "Space",
    description: "Launch, satellites and space infrastructure.",
    tickers: ["RKLB", "LUNR", "ASTS", "RTX", "LMT"],
  },
  {
    id: "crypto-blockchain",
    name: "Crypto / Blockchain",
    description: "Crypto-levered equities — exchanges, miners, treasuries.",
    tickers: ["COIN", "MSTR", "MARA", "RIOT", "HOOD", "CLSK"],
  },
  {
    id: "ev-battery",
    name: "EV / Battery",
    description: "Electric vehicles and batteries — demand and margin pressure.",
    tickers: ["TSLA", "RIVN", "LCID", "ALB", "QS", "ON"],
  },
];

const BY_TICKER = new Map<string, ThemeDef[]>();
for (const theme of THEMES) {
  for (const t of theme.tickers) {
    const key = t.toUpperCase();
    const arr = BY_TICKER.get(key) ?? [];
    arr.push(theme);
    BY_TICKER.set(key, arr);
  }
}

/** Themes a ticker participates in (may be several, or none). */
export function themesForTicker(symbol: string): ThemeDef[] {
  return BY_TICKER.get(symbol.toUpperCase().replace(/^\$/, "")) ?? [];
}

export const THEME_BY_ID = new Map(THEMES.map((t) => [t.id, t]));
