import { getMarketData } from "@/lib/data/provider";
import { analyzeMarket } from "@/lib/engine";
import { HottestWave } from "./components/HottestWave";
import { RotationMap } from "./components/RotationMap";
import { Playbook } from "./components/Playbook";
import { SectorTable } from "./components/SectorTable";
import { CYCLE_META } from "@/lib/ui";

// Re-run the engine on each request; the data layer manages its own caching.
export const dynamic = "force-dynamic";

export default async function Home() {
  const market = await getMarketData();
  const analysis = analyzeMarket(market);
  const asOf = new Date(analysis.asOf);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Logo />
            <h1 className="text-2xl font-bold tracking-tight text-white">MacroPulse</h1>
            <span className="chip border border-white/10 bg-white/5 text-white/50">
              sector wave & rotation intel
            </span>
          </div>
          <p className="mt-1.5 max-w-2xl text-sm text-white/50">
            Read the tape, find the hottest wave, see where capital rotates next — and know when to
            hop off.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 text-right">
          <span
            className="chip border"
            style={{
              background: `${CYCLE_META[analysis.cycle.stage].color}1a`,
              borderColor: `${CYCLE_META[analysis.cycle.stage].color}55`,
              color: CYCLE_META[analysis.cycle.stage].color,
            }}
          >
            {analysis.cycle.label} · {analysis.cycle.confidence}%
          </span>
          <span className="metric text-[11px] text-white/40">
            {analysis.source === "lunarcrush" ? "● live · LunarCrush" : "○ snapshot"} ·{" "}
            {asOf.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
      </header>

      {analysis.note && (
        <div className="mb-5 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-200/70">
          {analysis.note}
        </div>
      )}

      <div className="space-y-6">
        <HottestWave a={analysis.hottest} />
        <RotationMap analysis={analysis} />
        <Playbook nextWave={analysis.nextWave} exiting={analysis.exiting} />
        <SectorTable sectors={analysis.sectors} />
      </div>

      <Methodology benchmark={analysis.benchmark} />

      <footer className="mt-10 border-t border-white/10 pt-5 text-xs text-white/30">
        <p>
          MacroPulse · for research & education, not investment advice. Signals are model-derived and
          can be wrong — manage your own risk.
        </p>
      </footer>
    </main>
  );
}

function Methodology({ benchmark }: { benchmark: string }) {
  return (
    <details className="card mt-6 p-5 text-sm text-white/60">
      <summary className="cursor-pointer select-none font-medium text-white/80">
        How the engine works
      </summary>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="mb-1 font-semibold text-white/80">Heat Score (0–100)</h4>
          <p className="text-xs leading-relaxed">
            A cross-sectional blend of price momentum (35%), relative strength vs {benchmark} (20%),
            social/attention momentum (20%), sentiment (12%) and breadth (13%). Each dimension is
            percentile-ranked against all sectors, so the score always reflects today&apos;s
            opportunity set.
          </p>
        </div>
        <div>
          <h4 className="mb-1 font-semibold text-white/80">Wave Lifecycle</h4>
          <p className="text-xs leading-relaxed">
            Every theme moves Emerging → Momentum → Climax → Distribution → Decline. The classifier
            reads the interplay between the price trend and the attention trend — the tells that
            differ at each stage (e.g. price up while attention fades = distribution).
          </p>
        </div>
        <div>
          <h4 className="mb-1 font-semibold text-white/80">Hop-off Signal</h4>
          <p className="text-xs leading-relaxed">
            A checklist of exhaustion triggers — attention rolling off its peak, bearish
            price/attention divergence, crowd euphoria, overextension, thinning breadth, stalling
            momentum — each adding points with a plain-language reason, mirroring how a disciplined
            trader de-risks.
          </p>
        </div>
        <div>
          <h4 className="mb-1 font-semibold text-white/80">Rotation & Cycle Clock</h4>
          <p className="text-xs leading-relaxed">
            Inflow Score ranks where capital should rotate (rising attention + improving RS + healthy
            breadth, not yet stretched). It&apos;s cross-checked against a business-cycle clock that
            infers the macro stage from current leadership and points at the next stage&apos;s
            classic leaders.
          </p>
        </div>
      </div>
    </details>
  );
}

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
      <rect width="26" height="26" rx="7" fill="#0f1730" stroke="rgba(255,255,255,0.1)" />
      <path
        d="M4 15.5l4-6 3 4 3.5-7 3.5 9 4-3"
        stroke="#22c55e"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
