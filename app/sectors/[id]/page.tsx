import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMarketData } from "@/lib/data/provider";
import { analyzeDaily } from "@/lib/engine";
import { ScoreBar, Delta } from "@/app/components/primitives";
import { WaveLifecycle } from "@/app/components/WaveLifecycle";
import { SectorHeader } from "@/app/components/sector/SectorHeader";
import { SectorChart } from "@/app/components/sector/SectorChart";
import { ConvictionPanel } from "@/app/components/sector/ConvictionPanel";
import { ExitChecklist } from "@/app/components/sector/ExitChecklist";
import { PHASE_META, heatColor } from "@/lib/ui";

// Re-run the engine on each request; the data layer manages its own caching.
export const dynamic = "force-dynamic";

async function getSector(id: string) {
  const market = await getMarketData();
  const analysis = analyzeDaily(market);
  const a = analysis.sectors.find((s) => s.sector.id === id);
  return { analysis, a };
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const { a } = await getSector(params.id);
  if (!a) return { title: "Sector not found · MacroPulse" };
  return {
    title: `${a.sector.name} (${a.sector.etf}) · MacroPulse`,
    description: a.sector.description,
  };
}

export default async function SectorPage({ params }: { params: { id: string } }) {
  const { analysis, a } = await getSector(params.id);
  if (!a) notFound();

  const s = a.sector;
  const phaseMeta = PHASE_META[a.phase];

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      {/* 1. Header */}
      <SectorHeader a={a} />

      {/* 2. Wave lifecycle rail */}
      <section className="card p-6">
        <span className="label">Wave lifecycle</span>
        <div className="mt-3 max-w-2xl">
          <WaveLifecycle phase={a.phase} />
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/60">
          {a.phaseRationale}
        </p>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-white/40">
          <span style={{ color: phaseMeta.color }}>{phaseMeta.label}</span> — {phaseMeta.text}
        </p>
      </section>

      {/* 3. Price vs attention chart */}
      <section className="card p-6">
        <div className="flex items-center justify-between">
          <span className="label">Price vs attention · full history</span>
          <span className="metric text-xs text-white/40">{s.history.length} days</span>
        </div>
        <div className="mt-4">
          <SectorChart history={s.history} color={phaseMeta.color} />
        </div>
        <p className="mt-2 text-[11px] text-white/40">
          <span style={{ color: phaseMeta.color }}>━ price</span> ·{" "}
          <span className="text-sky-400/80">▒ attention (social dominance)</span> — each series
          normalized to its own range.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 4. Heat score breakdown */}
        <section className="card space-y-4 p-5">
          <div className="flex items-center justify-between">
            <span className="label">Heat score breakdown</span>
            <span className="metric text-xs" style={{ color: heatColor(a.heatScore) }}>
              {a.heatScore}/100
            </span>
          </div>
          {a.heatComponents.map((c) => (
            <ScoreBar
              key={c.key}
              label={c.label}
              value={c.value}
              weight={c.weight}
              detail={c.detail}
              color={heatColor(c.value)}
            />
          ))}
        </section>

        {/* 5. Conviction panel */}
        <ConvictionPanel c={a.conviction} />
      </div>

      {/* 6. Exit checklist */}
      <ExitChecklist
        triggers={a.exitTriggers}
        exitScore={a.exitScore}
        verdict={a.verdict}
        verdictColor={phaseMeta.color}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 7. Returns table */}
        <section className="card p-5">
          <span className="label">Returns &amp; relative strength</span>
          <div className="mt-3 grid grid-cols-3 gap-y-4">
            <Cell label="1D" v={s.ret1d} />
            <Cell label="1W" v={s.ret1w} />
            <Cell label="1M" v={s.ret1m} />
            <Cell label="3M" v={s.ret3m} />
            <Cell label="YTD" v={s.retYtd} />
            <div className="text-right">
              <div className="label">Price</div>
              <div className="metric text-sm text-white">${s.price.toFixed(2)}</div>
            </div>
          </div>
          <div className="mt-4 border-t border-white/10 pt-4">
            <span className="label">RS vs {analysis.benchmark} (percentage points)</span>
            <div className="mt-2 grid grid-cols-2 gap-y-2">
              <Cell label="RS 1M" v={s.rs1m} />
              <Cell label="RS 3M" v={s.rs3m} />
            </div>
          </div>
        </section>

        {/* 8 + 9. Leaders + where it sits */}
        <section className="card space-y-5 p-5">
          <div>
            <span className="label">Leaders</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {s.leaders.map((t) => (
                <span key={t} className="chip border border-white/10 bg-white/5 text-white/70">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="border-t border-white/10 pt-4">
            <span className="label">Where it sits</span>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <div className="metric text-2xl font-semibold text-white">
                  #{a.heatRank}
                </div>
                <div className="label mt-0.5">
                  of {analysis.sectors.length} by heat
                </div>
              </div>
              <div>
                <div className="metric text-2xl font-semibold" style={{ color: heatColor(a.inflowScore) }}>
                  {a.inflowScore}
                </div>
                <div className="label mt-0.5">inflow score · 0–100</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="mt-4 border-t border-white/10 pt-5 text-xs text-white/30">
        <p>
          MacroPulse · for research &amp; education, not investment advice. Signals are
          model-derived and can be wrong — manage your own risk.
        </p>
      </footer>
    </main>
  );
}

function Cell({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <div className="label">{label}</div>
      <Delta value={v} />
    </div>
  );
}
