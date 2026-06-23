# Deploying MacroPulse

MacroPulse is a standard **Next.js 14 (App Router)** app and ships with a bundled
data snapshot, so it builds and runs with **zero configuration** — no API keys
required. This guide walks you through getting it live.

> Heads up: the final "click Deploy" step happens in **your own Vercel account**.
> It's a quick GitHub login + repo import — anyone preparing this for you cannot
> press that button on your behalf. The steps below are everything you need.

---

## 1. Deploy to Vercel via GitHub (recommended, free)

This is the easiest path and gives you automatic deploys on every push.

1. Go to **https://vercel.com/new**.
2. Sign in with GitHub (free Hobby plan is fine).
3. Click **Import** next to the `4D-4STR4/macro-pulse` repository.
   (If you don't see it, grant Vercel access to the repo via "Adjust GitHub App Permissions".)
4. Vercel **auto-detects Next.js** — leave the defaults:
   - Framework Preset: **Next.js**
   - Build Command: `next build` (default)
   - Output: handled automatically (do not override)
5. (Optional) Expand **Environment Variables** and add any you want — see the
   [reference table](#5-environment-variable-reference) below. **All are optional**;
   with none set, the app runs on the bundled snapshot.
6. Click **Deploy**. After a minute you get a public URL like
   `https://macro-pulse.vercel.app`.
7. From now on, **every push to the repo auto-deploys**, and each pull request
   gets its own preview URL.

---

## 2. One-click "Deploy with Vercel" button

Prefer not to import manually? Use the button below — it clones the repo into your
own GitHub and deploys it in one flow:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2F4D-4STR4%2Fmacro-pulse)

You'll still log in with your own Vercel/GitHub account to finish the deploy.

---

## 3. Run a production build locally

To verify the exact production build on your machine:

```bash
npm install
npm run build && npm start
```

Then open **http://localhost:3000**. (`npm start` serves the optimized build that
`npm run build` produced.)

---

## 4. Alternative hosts

Vercel is the smoothest fit, but MacroPulse is a plain Next.js app and runs anywhere
that can run Node.

- **Netlify** — add the official adapter `@netlify/plugin-nextjs` (Netlify proposes
  it automatically when it detects Next.js). Build command `next build`; the plugin
  wires up the App Router and API routes.
- **Any Node host** (Render, Railway, Fly.io, a VPS, a container, etc.) — run
  `npm run build` once, then `npm start`. Next.js respects the `PORT` environment
  variable the host provides, so no extra config is usually needed. Use **Node 18+**
  (CI and Vercel use Node 20).

---

## 5. Environment variable reference

Every variable is **optional**. With none set, MacroPulse serves the bundled
real-context snapshot. These mirror [`.env.example`](./.env.example).

| Variable | Required | Values / Example | What it does |
|---|---|---|---|
| `LUNARCRUSH_API_KEY` | No | _(your key)_ | Switches the data layer to **live** LunarCrush data. Get one at https://lunarcrush.com/developers/api . Without it, the app uses the snapshot. |
| `MARKET_DATA_PROVIDER` | No | `snapshot` \| `lunarcrush` \| `stooq` | Forces a data source. Default is auto (LunarCrush if a key is present, otherwise the snapshot). `stooq` gives **free live prices with no key** (requires outbound network). |
| `MARKET_BENCHMARK` | No | `SPY` (default) | Benchmark ticker used for relative-strength calculations. |

If a live provider errors (rate limit, network, missing key), the app **falls back
to the bundled snapshot** rather than showing a blank screen.

---

## What about `vercel.json`?

A `vercel.json` is included, but it is **not required** to deploy — Vercel
auto-detects Next.js on its own. The file only pins the framework and adds a few
sensible security response headers (`X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`). You can safely delete it if you don't want those headers.
