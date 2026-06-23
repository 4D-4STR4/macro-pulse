import type { SectorSnapshot } from "@/lib/types";
import { normalizedSlope, tail, mean, last, clamp } from "./util";

/**
 * Derive the trend readings the rest of the engine relies on: how price and
 * the social conversation are moving recently, whether they agree, and how far
 * social has rolled off its peak. These are the raw ingredients for phase
 * classification and exit detection.
 */
export interface TrendRead {
  priceSlope: number; // % of mean / day over the recent window
  socialSlope: number;
  interactionsSlope: number;
  sentimentSlope: number;
  divergence: number; // priceSlope - socialSlope
  socialPeakRolloff: number; // 0..1, fraction below the trailing social peak
  interactionsPeakRolloff: number;
}

const RECENT = 14; // ~2 weeks of daily data defines "recent" momentum
const PEAK_WINDOW = 45; // look back ~6-7 weeks to locate the local peak

export function readTrends(s: SectorSnapshot): TrendRead {
  const h = s.history;
  const price = h.map((p) => p.price);
  const social = h.map((p) => p.socialDominance);
  const inter = h.map((p) => p.interactions);
  const sent = h.map((p) => p.sentiment);

  const priceSlope = normalizedSlope(tail(price, RECENT));
  const socialSlope = normalizedSlope(tail(social, RECENT));
  const interactionsSlope = normalizedSlope(tail(inter, RECENT));
  const sentimentSlope = normalizedSlope(tail(sent, RECENT));

  const socialPeak = Math.max(...tail(social, PEAK_WINDOW));
  const interPeak = Math.max(...tail(inter, PEAK_WINDOW));
  const socialNow = mean(tail(social, 3)); // smooth the last few days
  const interNow = mean(tail(inter, 3));

  const socialPeakRolloff = socialPeak > 0 ? clamp(1 - socialNow / socialPeak, 0, 1) : 0;
  const interactionsPeakRolloff = interPeak > 0 ? clamp(1 - interNow / interPeak, 0, 1) : 0;

  return {
    priceSlope,
    socialSlope,
    interactionsSlope,
    sentimentSlope,
    divergence: priceSlope - socialSlope,
    socialPeakRolloff,
    interactionsPeakRolloff,
  };
}

/** Convenience: is the recent price making higher highs vs the prior window? */
export function priceTurningUp(s: SectorSnapshot): boolean {
  const price = s.history.map((p) => p.price);
  if (price.length < 28) return last(price) > price[0];
  const recent = mean(tail(price, 14));
  const prior = mean(price.slice(-28, -14));
  return recent > prior;
}
