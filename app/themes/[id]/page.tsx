import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMarketData } from "@/lib/data/provider";
import { themeAnalysisFor } from "@/lib/themesService";
import { unitRole } from "@/lib/engine/ticker";
import { THEME_BY_ID } from "@/lib/data/themes";
import { Gauge, PhaseBadge, ConvictionBadge, ScoreBar, Delta } from "@/app/components/primitives";
import { WaveLifecycle } from "@/app/components/WaveLifecycle";
import { SectorChart } from "@/app/components/sector/SectorChart";
import { ConvictionPanel } from "@/app/components/sector/ConvictionPanel";
import { ExitChecklist } from "@/app/components/sector/ExitChecklist";
import { PHASE_META, ROLE_META, heatColor, exitColor } from "@/lib/ui";

export const dynamic = "force-dynamic";

async function getTheme(id: string) {
  const market = await getMarketData();
  const themeMA = await themeAnalysisFor(market);
  const a = themeMA?.sectors.find((s) => s.sector.id === id) ?? null;
  return { themeMA, a, def: THEME_BY_ID.get(id) ?? null };
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const def = THEME_BY_ID.get(params.id);
  return { title: def ? `${def.name} theme · MacroPulse` : "Theme not found · MacroPulse" };
}

export default async function ThemePage({ params }: { params: { id: string } }) {
  const { themeMA, a, def } = await getTheme(params.id);
  if (!a || !themeMA || !def) notFound();

  const phaseMeta = PHASE_META[a.phase];
  const role = unitRole(a, themeMA).role;
  const rm = ROLE_META[role] ?? ROLE_META.neutral;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      {/* Header */}
      <section className="card overflow-hidden p-6">
        <Link href="/themes" className="inline-flex items-center gap-1 text-xs text-white/45 transition-colors hover:text-white/80">
          <span aria-hidden>←</span> All themes
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-3xl font-bold tracking-tight text-white">{def.name}</h1>
              <span className="metric rounded-md bg-white/10 px-1.5 py-0.5 text-xs text-white/50">theme</span>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-snug text-white/50">{def.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="chip border" style={{ background: `${rm.color}1a`, borderColor: `${rm.color}66`, color: rm.color }}>
                ● {rm.label}
              </span>
              <PhaseBadge phase={a.phase} confidence={a.phaseConfidence} />
              <ConvictionBadge c={a.conviction} showAgreement />
            </div>
          </div>
          <div className="flex items-center gap-5">
            <Gauge value={a.heatScore} color={heatColor(a.heatScore)} label="Heat" sub="0–100" />
            <Gauge value={a.exitScore} color={exitColor(a.exitScore)} label="Exit" sub="0–100" />
          </div>
        </div>
      </section>

      {/* Lifecycle */}
      <section className="card p-6">
        <span className="label">Wave lifecycle</span>
        <div className="mt-3 max-w-2xl">
          <WaveLifecycle phase={a.phase} />
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/60">{a.phaseRationale}</p>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-white/40">
          <span style={{ color: phaseMeta.color }}>{phaseMeta.label}</span> — {phaseMeta.text}
        </p>
      </section>

      {/* Basket chart */}
      <section className="card p-6">
        <div className="flex items-center justify-between">
          <span className="label">Basket performance · full history</span>
          <span className="metric text-xs text-white/40">{a.sector.history.length} days</span>
        </div>
        <div className="mt-4">
          <SectorChart history={a.sector.history} color={phaseMeta.color} />
        </div>
        <p className="mt-2 text-[11px] text-white/40">
          <span style={{ color: phaseMeta.color }}>━ basket index</span> ·{" "}
          <span className="text-sky-400/80">▒ attention</span> — equal-weight basket of the theme&apos;s names.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-4 p-5">
          <div className="flex items-center justify-between">
            <span className="label">Heat score breakdown</span>
            <span className="metric text-xs" style={{ color: heatColor(a.heatScore) }}>{a.heatScore}/100</span>
          </div>
          {a.heatComponents.map((c) => (
            <ScoreBar key={c.key} label={c.label} value={c.value} weight={c.weight} detail={c.detail} color={heatColor(c.value)} />
          ))}
        </section>
        <ConvictionPanel c={a.conviction} />
      </div>

      <ExitChecklist triggers={a.exitTriggers} exitScore={a.exitScore} verdict={a.verdict} verdictColor={phaseMeta.color} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <span className="label">Basket returns &amp; relative strength</span>
          <div className="mt-3 grid grid-cols-3 gap-y-4">
            <Cell label="1W" v={a.sector.ret1w} />
            <Cell label="1M" v={a.sector.ret1m} />
            <Cell label="3M" v={a.sector.ret3m} />
            <Cell label="RS 1M" v={a.sector.rs1m} />
            <Cell label="RS 3M" v={a.sector.rs3m} />
            <div>
              <div className="label">Heat rank</div>
              <div className="metric text-sm text-white">#{a.heatRank} / {themeMA.sectors.length}</div>
            </div>
          </div>
        </section>

        <section className="card p-5">
          <span className="label">Constituents</span>
          <p className="mt-1 text-xs text-white/40">Click any to open its Ticker Map.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {def.tickers.map((t) => (
              <Link
                key={t}
                href={`/ticker/${t}`}
                className="chip border border-white/10 bg-white/5 text-white/75 transition-colors hover:border-sky-400/50 hover:text-sky-200"
              >
                {t}
              </Link>
            ))}
          </div>
        </section>
      </div>

      <footer className="mt-4 border-t border-white/10 pt-5 text-xs text-white/30">
        <p>MacroPulse · for research &amp; education, not investment advice. Signals are model-derived and can be wrong — manage your own risk.</p>
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
