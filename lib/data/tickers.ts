import { SECTORS } from "./sectors";

/**
 * Ticker → sector classification.
 *
 * A curated, GICS-aligned map of major US equities to the same sector ids the
 * engine uses. This is deliberately CURATED (not guessed): coverage is the
 * large/mid-cap US universe. Anything not in here resolves to `null`, and the
 * Ticker Map feature says so plainly rather than fabricating a sector — that's
 * the whole point of "signal, not misleading information."
 *
 * Notes on a few classifications people get wrong (current GICS, post-2023):
 *   - Visa / Mastercard / PayPal → Financials (moved out of IT in 2023).
 *   - Alphabet / Meta / Netflix → Communication Services.
 *   - Amazon / Tesla → Consumer Discretionary (consumer-cyclical).
 *   - Uber → Industrials (passenger ground transportation).
 */

// sectorId -> [ [ticker, company], ... ]
const BY_SECTOR: Record<string, [string, string][]> = {
  technology: [
    ["AAPL", "Apple"], ["MSFT", "Microsoft"], ["NVDA", "Nvidia"], ["AVGO", "Broadcom"],
    ["ORCL", "Oracle"], ["CRM", "Salesforce"], ["AMD", "Advanced Micro Devices"], ["ADBE", "Adobe"],
    ["CSCO", "Cisco"], ["ACN", "Accenture"], ["INTC", "Intel"], ["QCOM", "Qualcomm"],
    ["TXN", "Texas Instruments"], ["IBM", "IBM"], ["NOW", "ServiceNow"], ["INTU", "Intuit"],
    ["AMAT", "Applied Materials"], ["MU", "Micron"], ["LRCX", "Lam Research"], ["ADI", "Analog Devices"],
    ["PANW", "Palo Alto Networks"], ["SNPS", "Synopsys"], ["CDNS", "Cadence"], ["KLAC", "KLA"],
    ["ANET", "Arista Networks"], ["DELL", "Dell"], ["PLTR", "Palantir"], ["CRWD", "CrowdStrike"],
    ["SMCI", "Super Micro"], ["MRVL", "Marvell"], ["FTNT", "Fortinet"], ["NXPI", "NXP"],
  ],
  "communication-services": [
    ["GOOGL", "Alphabet"], ["GOOG", "Alphabet"], ["META", "Meta Platforms"], ["NFLX", "Netflix"],
    ["DIS", "Walt Disney"], ["CMCSA", "Comcast"], ["T", "AT&T"], ["VZ", "Verizon"],
    ["TMUS", "T-Mobile"], ["CHTR", "Charter"], ["EA", "Electronic Arts"], ["TTWO", "Take-Two"],
    ["WBD", "Warner Bros. Discovery"], ["OMC", "Omnicom"], ["SPOT", "Spotify"], ["PARA", "Paramount"],
  ],
  "consumer-cyclical": [
    ["AMZN", "Amazon"], ["TSLA", "Tesla"], ["HD", "Home Depot"], ["MCD", "McDonald's"],
    ["NKE", "Nike"], ["LOW", "Lowe's"], ["SBUX", "Starbucks"], ["BKNG", "Booking"],
    ["TJX", "TJX"], ["ORLY", "O'Reilly"], ["MAR", "Marriott"], ["GM", "General Motors"],
    ["F", "Ford"], ["CMG", "Chipotle"], ["ABNB", "Airbnb"], ["HLT", "Hilton"],
    ["ROST", "Ross Stores"], ["LULU", "Lululemon"], ["DHI", "D.R. Horton"], ["LEN", "Lennar"],
    ["YUM", "Yum! Brands"], ["AZO", "AutoZone"],
  ],
  "consumer-defensive": [
    ["WMT", "Walmart"], ["COST", "Costco"], ["PG", "Procter & Gamble"], ["KO", "Coca-Cola"],
    ["PEP", "PepsiCo"], ["PM", "Philip Morris"], ["MO", "Altria"], ["MDLZ", "Mondelez"],
    ["CL", "Colgate-Palmolive"], ["TGT", "Target"], ["KMB", "Kimberly-Clark"], ["GIS", "General Mills"],
    ["KHC", "Kraft Heinz"], ["SYY", "Sysco"], ["KR", "Kroger"], ["DG", "Dollar General"],
    ["KDP", "Keurig Dr Pepper"], ["STZ", "Constellation Brands"], ["HSY", "Hershey"],
  ],
  energy: [
    ["XOM", "Exxon Mobil"], ["CVX", "Chevron"], ["COP", "ConocoPhillips"], ["SLB", "Schlumberger"],
    ["EOG", "EOG Resources"], ["MPC", "Marathon Petroleum"], ["PSX", "Phillips 66"], ["VLO", "Valero"],
    ["OXY", "Occidental"], ["WMB", "Williams"], ["KMI", "Kinder Morgan"], ["HAL", "Halliburton"],
    ["BKR", "Baker Hughes"], ["DVN", "Devon Energy"], ["HES", "Hess"], ["FANG", "Diamondback"],
    ["OKE", "ONEOK"], ["LNG", "Cheniere"],
  ],
  "financial-services": [
    ["JPM", "JPMorgan Chase"], ["BAC", "Bank of America"], ["WFC", "Wells Fargo"], ["GS", "Goldman Sachs"],
    ["MS", "Morgan Stanley"], ["BRK.B", "Berkshire Hathaway"], ["V", "Visa"], ["MA", "Mastercard"],
    ["BLK", "BlackRock"], ["C", "Citigroup"], ["SPGI", "S&P Global"], ["AXP", "American Express"],
    ["SCHW", "Charles Schwab"], ["CB", "Chubb"], ["PGR", "Progressive"], ["PNC", "PNC"],
    ["USB", "U.S. Bancorp"], ["TFC", "Truist"], ["COF", "Capital One"], ["PYPL", "PayPal"],
    ["AON", "Aon"], ["ICE", "Intercontinental Exchange"], ["CME", "CME Group"], ["MMC", "Marsh McLennan"],
  ],
  healthcare: [
    ["LLY", "Eli Lilly"], ["UNH", "UnitedHealth"], ["JNJ", "Johnson & Johnson"], ["ABBV", "AbbVie"],
    ["MRK", "Merck"], ["PFE", "Pfizer"], ["TMO", "Thermo Fisher"], ["ABT", "Abbott"],
    ["DHR", "Danaher"], ["AMGN", "Amgen"], ["ISRG", "Intuitive Surgical"], ["BMY", "Bristol Myers Squibb"],
    ["GILD", "Gilead"], ["VRTX", "Vertex"], ["MDT", "Medtronic"], ["CVS", "CVS Health"],
    ["CI", "Cigna"], ["ELV", "Elevance Health"], ["REGN", "Regeneron"], ["ZTS", "Zoetis"],
    ["BSX", "Boston Scientific"], ["HCA", "HCA Healthcare"], ["MRNA", "Moderna"],
  ],
  industrials: [
    ["CAT", "Caterpillar"], ["GE", "GE Aerospace"], ["HON", "Honeywell"], ["UNP", "Union Pacific"],
    ["RTX", "RTX"], ["BA", "Boeing"], ["LMT", "Lockheed Martin"], ["DE", "Deere"],
    ["UPS", "UPS"], ["ETN", "Eaton"], ["ADP", "ADP"], ["GD", "General Dynamics"],
    ["NOC", "Northrop Grumman"], ["MMM", "3M"], ["EMR", "Emerson"], ["CSX", "CSX"],
    ["NSC", "Norfolk Southern"], ["FDX", "FedEx"], ["WM", "Waste Management"], ["ITW", "Illinois Tool Works"],
    ["PH", "Parker Hannifin"], ["TT", "Trane"], ["UBER", "Uber"],
  ],
  "basic-materials": [
    ["LIN", "Linde"], ["SHW", "Sherwin-Williams"], ["FCX", "Freeport-McMoRan"], ["NEM", "Newmont"],
    ["APD", "Air Products"], ["ECL", "Ecolab"], ["NUE", "Nucor"], ["DOW", "Dow"],
    ["DD", "DuPont"], ["PPG", "PPG"], ["CTVA", "Corteva"], ["VMC", "Vulcan Materials"],
    ["MLM", "Martin Marietta"], ["ALB", "Albemarle"], ["CF", "CF Industries"], ["STLD", "Steel Dynamics"],
  ],
  utilities: [
    ["NEE", "NextEra Energy"], ["SO", "Southern Company"], ["DUK", "Duke Energy"], ["CEG", "Constellation Energy"],
    ["AEP", "American Electric Power"], ["SRE", "Sempra"], ["D", "Dominion"], ["EXC", "Exelon"],
    ["XEL", "Xcel Energy"], ["PEG", "PSEG"], ["ED", "Con Edison"], ["VST", "Vistra"],
    ["AEE", "Ameren"], ["PCG", "PG&E"], ["WEC", "WEC Energy"],
  ],
  "real-estate": [
    ["PLD", "Prologis"], ["AMT", "American Tower"], ["EQIX", "Equinix"], ["WELL", "Welltower"],
    ["SPG", "Simon Property"], ["PSA", "Public Storage"], ["O", "Realty Income"], ["CCI", "Crown Castle"],
    ["DLR", "Digital Realty"], ["CSGP", "CoStar"], ["EXR", "Extra Space Storage"], ["AVB", "AvalonBay"],
    ["VICI", "Vici Properties"],
  ],
};

export interface TickerClassification {
  symbol: string;
  name: string;
  sectorId: string;
  sectorName: string;
  sectorEtf: string;
}

const SECTOR_META = new Map(SECTORS.map((s) => [s.id, s]));

// Build the flat lookup. Sector ETFs themselves also resolve (to their sector).
const LOOKUP = new Map<string, { name: string; sectorId: string }>();
for (const [sectorId, list] of Object.entries(BY_SECTOR)) {
  for (const [ticker, name] of list) {
    LOOKUP.set(ticker.toUpperCase(), { name, sectorId });
  }
}
// Include the sector ETFs and their named leaders from sectors.ts for consistency.
for (const s of SECTORS) {
  LOOKUP.set(s.etf.toUpperCase(), { name: `${s.name} sector ETF`, sectorId: s.id });
  for (const t of s.leaders) {
    if (!LOOKUP.has(t.toUpperCase())) LOOKUP.set(t.toUpperCase(), { name: t, sectorId: s.id });
  }
}

/** Normalize user input: strip $, whitespace, uppercase. */
export function normalizeSymbol(raw: string): string {
  return raw.trim().replace(/^\$/, "").toUpperCase();
}

/** Resolve a ticker to its sector, or null if we don't confidently know it. */
export function resolveTicker(raw: string): TickerClassification | null {
  const symbol = normalizeSymbol(raw);
  const hit = LOOKUP.get(symbol);
  if (!hit) return null;
  const meta = SECTOR_META.get(hit.sectorId);
  if (!meta) return null;
  return {
    symbol,
    name: hit.name,
    sectorId: hit.sectorId,
    sectorName: meta.name,
    sectorEtf: meta.etf,
  };
}

/** Total number of classified tickers (for transparency in the UI). */
export const TICKER_COVERAGE = LOOKUP.size;
