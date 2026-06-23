/**
 * The sector universe. Each US equity sector is tracked via its SPDR sector
 * ETF, which doubles as the LunarCrush topic ($xlk, $xle, ...) for the live
 * provider and as the identity used throughout the engine and snapshot.
 *
 * IDs intentionally match LunarCrush's stock `sector` keys so the two data
 * paths line up.
 */
export interface SectorDef {
  id: string;
  name: string;
  etf: string;
  description: string;
  leaders: string[];
}

export const SECTORS: SectorDef[] = [
  {
    id: "technology",
    name: "Technology",
    etf: "XLK",
    description: "Semiconductors, software and AI infrastructure — the secular growth engine.",
    leaders: ["NVDA", "MSFT", "AAPL", "AVGO"],
  },
  {
    id: "energy",
    name: "Energy",
    etf: "XLE",
    description: "Integrated oil & gas, E&P and services — the inflation / late-cycle trade.",
    leaders: ["XOM", "CVX", "COP", "SLB"],
  },
  {
    id: "financial-services",
    name: "Financials",
    etf: "XLF",
    description: "Banks, insurers and exchanges — geared to rates, credit and the cycle.",
    leaders: ["JPM", "BRK.B", "V", "MA"],
  },
  {
    id: "healthcare",
    name: "Healthcare",
    etf: "XLV",
    description: "Pharma, biotech and devices — defensive growth with GLP-1 leadership.",
    leaders: ["LLY", "UNH", "JNJ", "ABBV"],
  },
  {
    id: "industrials",
    name: "Industrials",
    etf: "XLI",
    description: "Capital goods, defense and transports — capex, reshoring and data-center build.",
    leaders: ["CAT", "GE", "HON", "UBER"],
  },
  {
    id: "consumer-cyclical",
    name: "Consumer Discretionary",
    etf: "XLY",
    description: "Retail, autos and travel — geared to the health of the consumer.",
    leaders: ["AMZN", "TSLA", "HD", "MCD"],
  },
  {
    id: "consumer-defensive",
    name: "Consumer Staples",
    etf: "XLP",
    description: "Food, beverage and household staples — the classic risk-off ballast.",
    leaders: ["WMT", "COST", "PG", "KO"],
  },
  {
    id: "communication-services",
    name: "Communication Services",
    etf: "XLC",
    description: "Mega-cap internet, media and telecom — ad cycles plus AI optionality.",
    leaders: ["META", "GOOGL", "NFLX", "DIS"],
  },
  {
    id: "utilities",
    name: "Utilities",
    etf: "XLU",
    description: "Regulated power — bond-proxy defensives, now an AI-power demand story.",
    leaders: ["NEE", "SO", "DUK", "CEG"],
  },
  {
    id: "basic-materials",
    name: "Materials",
    etf: "XLB",
    description: "Miners, chemicals and metals — copper and the electrification trade.",
    leaders: ["LIN", "FCX", "SHW", "NEM"],
  },
  {
    id: "real-estate",
    name: "Real Estate",
    etf: "XLRE",
    description: "REITs — rate-sensitive yield, levered to the direction of long bonds.",
    leaders: ["PLD", "AMT", "EQIX", "WELL"],
  },
];

export const SECTOR_BY_ETF: Record<string, SectorDef> = Object.fromEntries(
  SECTORS.map((s) => [s.etf, s])
);
