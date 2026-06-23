# MacroPulse — autonomous loop notes

**Goal:** make MacroPulse a powerful investing/trading decision tool. Each loop:
ship ONE verified, on-mission improvement (build / improve / backtest / validate
/ de-bloat). Read this file first to continue where the last loop left off.

## Done
- **L1** — Signal Track Record (`/signals`): walk-forward backtest that re-runs
  the engine at every past day and measures realized forward return by phase,
  exit-score bucket and heat rank. Added nav link. Removed unused `DailyPulse`
  component (bloat).

## Findings so far
- On the bundled snapshot (illustrative): Momentum/Climax/Emerging precede
  positive forward returns; Decline negative; heat leaders persist (~+1.8% vs
  laggards ~-0.4% over 10d). The **exit/hop-off signal shows no clean edge on
  synthetic data** — flagged to re-validate against live history.

## Next up (pick the top item; reorder as priorities change)
1. **Validate exit signal on real history** — once a live price key is set, the
   backtest becomes meaningful; consider tuning exit triggers if no edge.
2. **Themes backtest** — extend the walk-forward to theme baskets.
3. **Risk panel** on sector/theme/ticker pages — volatility, max drawdown,
   beta/correlation to SPY (all derivable from existing history).
4. **Alerts** — notify when a watched sector/ticker crosses exit threshold or
   flips phase (client-side, builds on the watchlist).
5. **Compare view** — 2–4 tickers/sectors/themes side by side.
6. **Mobile polish** pass.

## Conventions
- Develop on `claude/admiring-ptolemy-otebgn`; deploy by merging a PR to `main`
  (Vercel auto-deploys `main`). Only merge/deploy when the user asks.
- Before every commit: `tsc --noEmit` clean, `next build` clean, screenshot the
  change, zero console errors.
- No new heavy deps without reason; keep the engine pure/testable.

## Note on scheduling
This environment has no cron/wakeup tool, so the loop can't truly auto-fire on a
timer. Continuity lives in this file — re-trigger `/loop` to run the next item.
