# MacroPulse

**Sector wave & rotation intelligence for traders.**

Markets move in cycles and themes. The edge is in riding the *current* wave and
hopping off *before* it tops — then rotating into whatever leads next. MacroPulse
reads the tape across every US equity sector and answers three questions a trader
asks every day:

1. **What's hot right now?** — the leading sector/theme, ranked by a composite Heat Score.
2. **Where does capital rotate next?** — a data + business-cycle rotation map of the most likely next waves.
3. **When do I hop off?** — a per-sector "Hop-off Signal" that flags exhaustion before the crowd.

> ⚠️ For research & education only. Not investment advice. Signals are model-derived and can be wrong — manage your own risk.

---

## What it looks like

A single dashboard:

- **The Current Wave** — the hottest sector with its Heat Score breakdown, lifecycle phase, price-vs-attention sparkline, and a live exit checklist.
- **Rotation Map** — predicted capital flow (out of exhausting waves, into the next ones), overlaid on an inferred business-cycle clock.
- **Playbook** — two columns: *Next Wave — rotate in* and *Exit Watch — hop off*.
- **All Sectors** — the full, sortable board (Heat / Exit / Inflow / returns / relative strength / lifecycle).
- **Ticker Map** — type *any* ticker (`/ticker/NVDA`) to see its sector, that sector's rotation role (**Hot now / Rotate in / Avoid / Neutral**), the stock's *own* technical score (when live data is on), and a combined, confidence-weighted read. Classification is live for any US-listed equity (curated map → live lookup); funds/ETFs and unresolvable symbols are flagged rather than force-fit — signal, not noise.

---

## The analysis engine

The engine (`lib/engine/`) is the core of the product. It's a set of pure,
dependency-free functions over a normalized `MarketSnapshot`, so it's easy to
test, reason about, and reuse.

### Heat Score — *"how hot is this sector, right now"* (0–100)
A cross-sectional blend, each dimension **percentile-ranked against all sectors**
so the score always reflects today's opportunity set:

| Dimension | Weight | What it captures |
|---|---|---|
| Price momentum | 35% | Blended 1w/1m/3m return — the definition of leadership |
| Relative strength | 20% | Out/under-performance vs the benchmark (SPY) |
| Social momentum | 20% | Rising attention (social-dominance slope + Galaxy Score) |
| Sentiment | 12% | Bullishness of the conversation |
| Breadth | 13% | Participation under the surface |

### Wave Lifecycle — *where on the arc is this theme?*
Every theme moves through the same arc. The classifier reads the **interplay of
the price trend and the attention trend** — the tells differ at each stage:

```
Emerging  →  Momentum  →  Climax  →  Distribution  →  Decline
(accumulate)  (ride)     (trim)     (exit)           (avoid)
```

- **Emerging** — attention rising off a low base, price turning up, not yet extended.
- **Momentum** — price + attention rising together. The clean markup.
- **Climax** — price parabolic *and* sentiment/attention at crowd extremes. Euphoria.
- **Distribution** — price stalling while attention rolls off its peak. The bearish divergence where smart money sells into the crowd.
- **Decline** — price down, attention gone. Dead money.

### Hop-off Signal — *when to get out* (0–100)
Not one opaque number but a **checklist of exhaustion triggers**, each adding
points with a plain-language reason — mirroring how a disciplined trader de-risks:

- Attention rolling off its peak (the crowd is leaving)
- Bearish price/attention divergence (price up, conversation down)
- Crowd euphoria (sentiment + attention at extremes)
- Overextension (price stretched far beyond peers)
- Breadth deterioration (fewer names participating)
- Momentum stalling after a strong run

### Rotation & the Cycle Clock — *where capital goes next*
- **Inflow Score** ranks rotation destinations: rising attention + improving relative strength + healthy breadth, while *not* yet stretched and with a low exit signal.
- A **business-cycle clock** infers the macro stage from current sector leadership (early → mid → late → recession) and points at the next stage's classic leaders.
- The two are combined into directional **rotation edges** (out of exhausting sectors, into heating ones), favouring moves the cycle clock agrees with.

---

## Data layer (pluggable)

The engine and UI only ever see a normalized shape (`lib/types.ts`), so the data
source is swappable (`lib/data/provider.ts`):

| Provider | When it's used | Source |
|---|---|---|
| **Snapshot** (default) | Always works, zero config | Bundled `data/snapshot.json` |
| **LunarCrush** | When `LUNARCRUSH_API_KEY` is set | LunarCrush API v4 (sector ETFs as topics) |

Selection is automatic (LunarCrush if a key is present, else the snapshot) and can
be forced with `MARKET_DATA_PROVIDER`. If a live provider errors, the app **falls
back to the snapshot** rather than showing a blank screen.

### The bundled snapshot
`data/snapshot.json` is a **real-context seed** reflecting the late-June-2026
market (Energy leading, Tech distributing after its run, defensives/materials
emerging as the cycle turns late). It's generated by a documented, deterministic
model — synthetic-but-faithful paths where every return, slope and phase is
mutually consistent:

```bash
npm run generate:snapshot   # rewrites data/snapshot.json
```

It exists so the app runs end-to-end out of the box, and is replaced wholesale
the moment live data is wired in.

### Going live — the data stack

The data layer is a graceful fallback chain, so any subset of keys works. Set
them in `.env` (local) or your host's environment variables.

**Prices** (sectors, themes, stock scores) — first available wins:

| Source | Key | Notes |
|---|---|---|
| Polygon.io | `POLYGON_API_KEY` | Exchange-grade, most accurate. **Best.** |
| FMP | `FMP_API_KEY` | Reliable from servers, free tier. Also does classification. |
| Yahoo | *(keyless)* | Works locally; often blocked on serverless/datacenter IPs. |
| Stooq | *(keyless)* | Last-resort fallback. |

**Social / attention** (sentiment, social dominance, conviction, exit timing):

| Source | Key | Notes |
|---|---|---|
| LunarCrush | `LUNARCRUSH_API_KEY` | **Real** social signal. Without it, social is a price/volume proxy. The biggest accuracy upgrade. |

Then set `MARKET_DATA_PROVIDER=live` to turn on live sectors + theme baskets.
(Even without it, individual ticker **stock scores** are computed live.)

**Background refresh:** `GET /api/cron/refresh` warms the cache (each price fetch
is cached ~30 min). A daily Vercel Cron is configured in `vercel.json`; for more
frequent refresh use a Vercel Pro cron or a free external pinger.

---

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
# or
npm run build && npm start
```

Requires Node 18+.

### API
The whole analysis is also available as JSON for bots / external clients:

```
GET /api/market          →  full MarketAnalysis (heat-ranked sectors, phases,
                            exit signals, next wave, cycle read, rotation edges)
GET /api/ticker/{symbol}  →  Ticker Map (sector + role, stock score, reasoned read)
```

---

## Deploy

Get it online (and on your phone) in a couple of minutes — full guide in
**[DEPLOY.md](DEPLOY.md)**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2F4D-4STR4%2Fmacro-pulse)

It deploys with zero config on the bundled snapshot; set `MARKET_DATA_PROVIDER=stooq`
for free live prices, or `LUNARCRUSH_API_KEY` for full live social data.

---

## Project structure

```
app/
  page.tsx                 dashboard (server component: load → analyze → render)
  api/market/route.ts      JSON analysis endpoint
  components/              HottestWave, RotationMap, CycleClock, Playbook,
                           SectorTable, WaveLifecycle, primitives (SVG gauges…)
lib/
  types.ts                 normalized domain + engine output types
  engine/                  the analysis engine
    heat.ts                Heat Score
    phase.ts               wave lifecycle classifier
    exit.ts                hop-off signal + triggers
    cycle.ts               business-cycle clock
    trends.ts              price/attention trend reads
    index.ts               orchestration → MarketAnalysis
  data/
    provider.ts            provider selection + fallback
    snapshotProvider.ts    bundled snapshot
    lunarcrushProvider.ts  LunarCrush API v4
    sectors.ts             sector ↔ ETF universe
data/snapshot.json         the shipped real-context dataset
scripts/generate-snapshot.mjs
```

---

## Tech & roadmap

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind. No chart library —
the gauges/sparklines/clock are hand-rolled SVG to keep the bundle tiny.

**Roadmap ideas:** crypto-sector mode (LunarCrush has rich crypto sectors),
per-sector detail pages with constituent leaders, alerting when a held sector
crosses an exit threshold, backtesting the phase/exit signals, and a watchlist
that maps your positions onto the rotation map.

> **Security note:** pinned to Next.js 14.2.35 (resolves the Dec-2025 critical
> advisory). Some self-hosted-only DoS/SSRF advisories affecting the entire 14.x
> line are fully patched only in Next 16 (a React 19 major upgrade); revisit when
> upgrading.
