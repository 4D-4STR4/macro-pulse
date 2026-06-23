/**
 * LunarCrush social overlay.
 *
 * The live price path derives social metrics from a price/volume PROXY. When a
 * LunarCrush key is present we replace that proxy with REAL social data —
 * sentiment, social dominance, attention (interactions) and Galaxy Score — which
 * is what turns the app's conviction + exit-timing signals from proxy into true
 * signal. Best-effort and defensive: any failure leaves the proxy in place.
 *
 * Docs: https://lunarcrush.com/developers/api/endpoints
 */
export interface SocialOverlay {
  socialDominance: number;
  sentiment: number; // 0-100
  galaxyScore: number; // 0-100
  interactions: number;
}

interface LCTopic {
  data?: {
    social_dominance?: number;
    sentiment?: number;
    galaxy_score?: number;
    interactions_24h?: number;
  };
}

/** Fetch a single topic's social snapshot, or null on any failure. */
export async function fetchTopicSocial(topic: string): Promise<SocialOverlay | null> {
  const key = process.env.LUNARCRUSH_API_KEY;
  if (!key) return null;
  try {
    const init: RequestInit & { next?: { revalidate: number } } = {
      headers: { Authorization: `Bearer ${key}` },
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(5000),
    };
    const res = await fetch(
      `https://lunarcrush.com/api4/public/topic/${encodeURIComponent(topic)}/v1`,
      init,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as LCTopic;
    const d = json?.data;
    if (!d) return null;
    const clamp = (x: number) => Math.max(0, Math.min(100, x));
    return {
      socialDominance: Number.isFinite(d.social_dominance ?? NaN) ? (d.social_dominance as number) : 0,
      sentiment: clamp(Number.isFinite(d.sentiment ?? NaN) ? (d.sentiment as number) : 50),
      galaxyScore: clamp(Number.isFinite(d.galaxy_score ?? NaN) ? (d.galaxy_score as number) : 50),
      interactions: Number.isFinite(d.interactions_24h ?? NaN) ? (d.interactions_24h as number) : 0,
    };
  } catch {
    return null;
  }
}

export const hasLunarKey = () => !!process.env.LUNARCRUSH_API_KEY;
