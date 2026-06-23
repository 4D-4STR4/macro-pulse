import type { MarketSnapshot, SectorHistoryPoint, ThemeSnapshot } from "@/lib/types";
import { fetchDailySeries, type DailyRow } from "./stooqProvider";
import { THEMES } from "./themes";

/**
 * Live theme scoring — compute each theme's heat from its constituents' REAL
 * prices (Stooq), so themes are genuine signal on a deploy, not just the seed.
 *
 * For each theme we build an equal-weight, normalized basket index from its
 * constituents, then derive the same fields a SectorSnapshot carries (returns,
 * relative strength vs the benchmark, breadth, and a transparent price/volume
 * social proxy). The result flows through the exact same theme analysis.
 *
 * Resilient by design: constituent fetches are deduped and fault-tolerant; a
 * theme needs a quorum of constituents to score, and if too little live data is
 * available the whole thing returns null so the caller falls back to the seed.
 */

const WINDOW = 90;
const MAX_CONSTITUENTS = 8; // bound the fetch count
const MIN_CONSTITUENTS = 3; // quorum to score a theme

const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const round = (x: number, dp = 2) => Math.round(x * 10 ** dp) / 10 ** dp;
const toStooq = (s: string) => s.replace(/\./g, "-");

const trailing = (p: number[], lb: number) =>
  p.length < 2 ? 0 : pct(p[p.length - 1], p[Math.max(0, p.length - 1 - lb)]);
const momAt = (p: number[], i: number, n: number) => pct(p[i], p[Math.max(0, i - n)]);
const smaAt = (p: number[], i: number, n: number) => {
  const lo = Math.max(0, i - n + 1);
  let s = 0;
  for (let k = lo; k <= i; k++) s += p[k];
  return s / (i - lo + 1);
};

export async function computeLiveThemes(market: MarketSnapshot): Promise<ThemeSnapshot[] | null> {
  // Unique constituents across all themes (deduped — many overlap).
  const symbols = new Set<string>();
  for (const t of THEMES) for (const s of t.tickers.slice(0, MAX_CONSTITUENTS)) symbols.add(s.toUpperCase());

  const fetched = await Promise.all(
    [...symbols].map(async (sym) => {
      try {
        return [sym, await fetchDailySeries(toStooq(sym))] as const;
      } catch {
        return [sym, null] as const;
      }
    }),
  );
  const data = new Map(fetched);
  const okCount = fetched.filter(([, r]) => r && r.length >= 2).length;
  if (okCount < 8) return null; // not enough live data — caller falls back to seed

  const benchPrices =
    market.benchmarkHistory && market.benchmarkHistory.length > 2
      ? market.benchmarkHistory.slice(-WINDOW)
      : null;
  const benchRet1m = benchPrices ? trailing(benchPrices, 21) : market.benchmarkRet1m;
  const benchRet3m = benchPrices ? trailing(benchPrices, 63) : market.benchmarkRet3m;
  const dateAxis = market.sectors[0]?.history?.map((h) => h.date) ?? null;

  // Build each theme's normalized basket index + per-bar volume.
  type Basket = { id: string; idx: number[]; vol: number[]; closes: number[][] } | { id: string; idx: null };
  const baskets: Basket[] = THEMES.map((theme) => {
    const series = theme.tickers
      .slice(0, MAX_CONSTITUENTS)
      .map((s) => data.get(s.toUpperCase()))
      .filter((r): r is DailyRow[] => !!r && r.length >= 2)
      .map((r) => r.slice(-WINDOW));
    if (series.length < MIN_CONSTITUENTS) return { id: theme.id, idx: null };

    const L = Math.min(...series.map((s) => s.length), benchPrices ? benchPrices.length : Infinity);
    const idx: number[] = [];
    const vol: number[] = [];
    for (let i = 0; i < L; i++) {
      let sum = 0;
      let n = 0;
      let v = 0;
      for (const s of series) {
        const base = s[s.length - L].close;
        const c = s[s.length - L + i].close;
        if (base > 0) {
          sum += c / base;
          n++;
        }
        v += s[s.length - L + i].volume || 0;
      }
      idx.push(n ? (sum / n) * 100 : 0);
      vol.push(v);
    }
    const closes = series.map((s) => s.slice(s.length - L).map((r) => r.close));
    return { id: theme.id, idx, vol, closes };
  });

  // Cross-sectional activity denominator for socialDominance (last bar).
  const totalActivity = baskets.reduce((acc, b) => {
    if (b.idx === null) return acc;
    return acc + Math.abs(momAt(b.idx, b.idx.length - 1, 5)) * (b.vol[b.vol.length - 1] || 0);
  }, 0);

  const out: ThemeSnapshot[] = [];
  for (const theme of THEMES) {
    const b = baskets.find((x) => x.id === theme.id);
    if (!b || b.idx === null) continue;
    const P = b.idx;
    const L = P.length;
    const last = L - 1;

    const history: SectorHistoryPoint[] = P.map((price, i) => {
      const mom5 = i >= 5 ? momAt(P, i, 5) : 0;
      const rs = (i >= 21 ? momAt(P, i, 21) : 0) - benchRet1m;
      const activity = Math.abs(mom5) * (b.vol[i] || 0);
      return {
        date: dateAxis ? dateAxis[dateAxis.length - L + i] ?? isoDaysAgo(L - 1 - i) : isoDaysAgo(L - 1 - i),
        price: round(price, 2),
        socialDominance: totalActivity > 0 ? round(clamp((activity / totalActivity) * 100, 0, 100)) : 0,
        sentiment: round(clamp(50 + mom5 * 2.2, 1, 99), 1),
        interactions: Math.round(b.vol[i] || 0),
        galaxyScore: round(clamp(50 + mom5 * 1.6 + rs * 1.1, 1, 100), 1),
      };
    });

    // breadth: % of constituents above their own 50-day MA at the last bar.
    let above = 0;
    for (const c of b.closes) above += c[c.length - 1] >= smaAt(c, c.length - 1, 50) ? 1 : 0;
    const breadth = round(clamp((above / b.closes.length) * 100, 0, 100));

    const ret1m = trailing(P, 21);
    const ret3m = trailing(P, 63);
    const today = history[last];
    out.push({
      id: theme.id,
      name: theme.name,
      etf: "",
      description: theme.description,
      leaders: theme.tickers.slice(0, 4),
      price: round(P[last], 2),
      ret1d: round(trailing(P, 1), 2),
      ret1w: round(trailing(P, 5), 2),
      ret1m: round(ret1m, 2),
      ret3m: round(ret3m, 2),
      retYtd: round(trailing(P, L - 1), 2),
      rs1m: round(ret1m - benchRet1m, 2),
      rs3m: round(ret3m - benchRet3m, 2),
      galaxyScore: today.galaxyScore,
      altRank: 999,
      socialDominance: today.socialDominance,
      sentiment: today.sentiment,
      interactions: today.interactions,
      breadth,
      history,
    });
  }

  if (out.length < 6) return null;
  // AltRank by galaxy score (1 = best).
  [...out].sort((a, b) => b.galaxyScore - a.galaxyScore).forEach((t, i) => (t.altRank = i + 1));
  return out;
}

function isoDaysAgo(daysBack: number): string {
  return new Date(Date.now() - daysBack * 86400000).toISOString().slice(0, 10);
}
