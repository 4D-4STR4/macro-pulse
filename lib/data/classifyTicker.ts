import { SECTORS } from "./sectors";
import { resolveTicker, normalizeSymbol, type TickerClassification } from "./tickers";

/**
 * Live ticker classification — makes ANY US-listed equity mappable.
 *
 * Fallback chain (most reliable first):
 *   1. curated map (lib/data/tickers.ts) — instant, hand-verified.
 *   2. FMP company profile — if FMP_API_KEY is set (robust, keyed).
 *   3. keyless lookup (Yahoo search endpoint) — best-effort, unofficial.
 *   4. none — we don't fabricate a sector.
 *
 * The returned GICS-style sector name is mapped onto MacroPulse's 11 sectors.
 * ETFs / funds / indices are flagged (`fund: true`) rather than forced into a
 * single sector. Results are cached per server instance.
 */

export interface ClassifyResult {
  symbol: string;
  classification: TickerClassification | null;
  via: "curated" | "live" | "none";
  source?: "fmp" | "yahoo";
  name?: string; // best-known company name even when sector is unknown
  fund?: boolean; // ETF / mutual fund / index — no single sector
  note?: string; // e.g. why the live lookup didn't resolve a sector
}

const SECTOR_META = new Map(SECTORS.map((s) => [s.id, s]));

// Yahoo/FMP GICS-style sector names → our sector ids.
const NAME_TO_ID: Record<string, string> = {
  "technology": "technology",
  "information technology": "technology",
  "healthcare": "healthcare",
  "health care": "healthcare",
  "financial services": "financial-services",
  "financials": "financial-services",
  "financial": "financial-services",
  "energy": "energy",
  "consumer cyclical": "consumer-cyclical",
  "consumer discretionary": "consumer-cyclical",
  "consumer defensive": "consumer-defensive",
  "consumer staples": "consumer-defensive",
  "industrials": "industrials",
  "industrial": "industrials",
  "basic materials": "basic-materials",
  "materials": "basic-materials",
  "real estate": "real-estate",
  "utilities": "utilities",
  "communication services": "communication-services",
  "communications": "communication-services",
};

function sectorIdFromName(name?: string | null): string | null {
  if (!name) return null;
  return NAME_TO_ID[name.trim().toLowerCase()] ?? null;
}

function buildClassification(symbol: string, name: string, sectorId: string): TickerClassification | null {
  const meta = SECTOR_META.get(sectorId);
  if (!meta) return null;
  return { symbol, name, sectorId, sectorName: meta.name, sectorEtf: meta.etf };
}

const cache = new Map<string, ClassifyResult>();

export async function classifyTicker(raw: string): Promise<ClassifyResult> {
  const symbol = normalizeSymbol(raw);
  const cached = cache.get(symbol);
  if (cached) return cached;

  // 1. curated
  const curated = resolveTicker(symbol);
  if (curated) {
    const res: ClassifyResult = { symbol, classification: curated, via: "curated", name: curated.name };
    cache.set(symbol, res);
    return res;
  }

  // 2/3. live
  const live = (await liveFmp(symbol)) ?? (await liveYahoo(symbol)) ?? null;
  const res: ClassifyResult = live ?? { symbol, classification: null, via: "none" };
  cache.set(symbol, res);
  return res;
}

async function withTimeout(url: string, headers?: Record<string, string>) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(4500) });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

/** FMP company profile (keyed, robust). Returns null if no key or on failure. */
async function liveFmp(symbol: string): Promise<ClassifyResult | null> {
  const key = process.env.FMP_API_KEY;
  if (!key) return null;
  try {
    const json = await withTimeout(
      `https://financialmodelingprep.com/api/v3/profile/${encodeURIComponent(symbol)}?apikey=${key}`,
    );
    const p = Array.isArray(json) ? json[0] : null;
    if (!p) return null;
    const name: string = p.companyName || symbol;
    if (p.isEtf || p.isFund) {
      return { symbol, classification: null, via: "live", source: "fmp", name, fund: true };
    }
    const id = sectorIdFromName(p.sector);
    if (id) {
      const c = buildClassification(symbol, name, id);
      if (c) return { symbol, classification: c, via: "live", source: "fmp", name };
    }
    return { symbol, classification: null, via: "live", source: "fmp", name, note: "no GICS sector returned" };
  } catch {
    return null;
  }
}

/** Keyless Yahoo search lookup (best-effort, unofficial). */
async function liveYahoo(symbol: string): Promise<ClassifyResult | null> {
  try {
    const json = await withTimeout(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=1&newsCount=0`,
      { "User-Agent": "Mozilla/5.0 (compatible; MacroPulse/1.0)" },
    );
    const q = json?.quotes?.find((x: { symbol?: string }) => (x.symbol || "").toUpperCase() === symbol) || json?.quotes?.[0];
    if (!q) return null;
    const name: string = q.longname || q.shortname || symbol;
    const type = (q.quoteType || "").toUpperCase();
    if (type && type !== "EQUITY") {
      return { symbol, classification: null, via: "live", source: "yahoo", name, fund: type !== "INDEX", note: `quote type ${type}` };
    }
    const id = sectorIdFromName(q.sector);
    if (id) {
      const c = buildClassification(symbol, name, id);
      if (c) return { symbol, classification: c, via: "live", source: "yahoo", name };
    }
    return { symbol, classification: null, via: "live", source: "yahoo", name, note: "no sector on quote" };
  } catch {
    return null;
  }
}
