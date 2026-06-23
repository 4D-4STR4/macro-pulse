// Small, dependency-free numeric helpers used across the engine.

export const clamp = (x: number, lo = 0, hi = 100): number =>
  Math.max(lo, Math.min(hi, x));

export const mean = (xs: number[]): number =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

export const std = (xs: number[]): number => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

/** Min-max normalize a value within a population to 0-100. */
export const minMax = (x: number, pop: number[]): number => {
  const lo = Math.min(...pop);
  const hi = Math.max(...pop);
  if (hi === lo) return 50;
  return ((x - lo) / (hi - lo)) * 100;
};

/**
 * Cross-sectional percentile rank of x within pop, 0-100.
 * More robust than min-max to single outliers.
 */
export const percentileRank = (x: number, pop: number[]): number => {
  if (pop.length === 0) return 50;
  const below = pop.filter((p) => p < x).length;
  const equal = pop.filter((p) => p === x).length;
  return ((below + 0.5 * equal) / pop.length) * 100;
};

/**
 * Ordinary-least-squares slope of y over an evenly spaced x (0..n-1),
 * expressed as % change per step relative to the series mean. This makes
 * slopes comparable across series of different absolute magnitudes.
 */
export const normalizedSlope = (ys: number[]): number => {
  const n = ys.length;
  if (n < 2) return 0;
  const xs = ys.map((_, i) => i);
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den; // units of y per step
  const base = Math.abs(my) > 1e-9 ? Math.abs(my) : 1;
  return (slope / base) * 100; // % of mean per step
};

/** Last value of a series. */
export const last = <T>(xs: T[]): T => xs[xs.length - 1];

/** Take the trailing n elements. */
export const tail = <T>(xs: T[], n: number): T[] => xs.slice(Math.max(0, xs.length - n));

export const round = (x: number, dp = 1): number => {
  const f = 10 ** dp;
  return Math.round(x * f) / f;
};
