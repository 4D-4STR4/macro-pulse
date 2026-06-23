import { TrendingUp, LogOut } from "lucide-react";
import type { SectorAnalysis } from "@/lib/types";
import { PhaseBadge, Sparkline, Delta } from "./primitives";
import { WaveLifecycle } from "./WaveLifecycle";
import { PHASE_META, exitColor, heatColor } from "@/lib/ui";

/** Two-column playbook: where to rotate INTO vs what to hop OFF. */
export function Playbook({
  nextWave,
  exiting,
}: {
  nextWave: SectorAnalysis[];
  exiting: SectorAnalysis[];
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="card p-6">
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <span className="icon-tile h-7 w-7" style={{ background: "#22c55e1a", borderColor: "#22c55e44", color: "#22c55e" }}>
              <TrendingUp size={15} strokeWidth={2.4} />
            </span>
            Next Wave — rotate in
          </h2>
          <p className="text-xs text-white/45">
            Heating up but not yet exhausted — best destinations for fresh capital.
          </p>
        </div>
        <div className="space-y-3">
          {nextWave.map((a) => (
            <NextCard key={a.sector.id} a={a} />
          ))}
        </div>
      </section>

      <section className="card p-6">
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <span className="icon-tile h-7 w-7" style={{ background: "#ef44441a", borderColor: "#ef444444", color: "#ef4444" }}>
              <LogOut size={15} strokeWidth={2.4} />
            </span>
            Exit Watch — hop off
          </h2>
          <p className="text-xs text-white/45">
            Waves flashing exhaustion. De-risk or stand aside.
          </p>
        </div>
        <div className="space-y-3">
          {exiting.length === 0 && (
            <p className="text-sm text-white/40">
              Nothing in distribution right now — no waves demanding an exit.
            </p>
          )}
          {exiting.map((a) => (
            <ExitCard key={a.sector.id} a={a} />
          ))}
        </div>
      </section>
    </div>
  );
}

function NextCard({ a }: { a: SectorAnalysis }) {
  const s = a.sector;
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{s.name}</span>
            <span className="metric text-[10px] text-white/40">{s.etf}</span>
            <PhaseBadge phase={a.phase} />
          </div>
          <p className="mt-1 text-xs text-white/50">{a.verdict}</p>
        </div>
        <div className="text-right">
          <span className="label">Inflow</span>
          <div className="metric text-xl font-semibold" style={{ color: heatColor(a.inflowScore) }}>
            {a.inflowScore}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <Sparkline
          price={s.history.map((p) => p.price)}
          social={s.history.map((p) => p.socialDominance)}
          width={150}
          height={36}
          color={PHASE_META[a.phase].color}
        />
        <div className="flex gap-3 text-right text-xs">
          <div>
            <div className="label">RS 1M</div>
            <Delta value={s.rs1m} />
          </div>
          <div>
            <div className="label">Heat</div>
            <span className="metric text-white/80">{a.heatScore}</span>
          </div>
        </div>
      </div>
      <div className="mt-2">
        <WaveLifecycle phase={a.phase} compact />
      </div>
    </div>
  );
}

function ExitCard({ a }: { a: SectorAnalysis }) {
  const s = a.sector;
  const top = a.exitTriggers.filter((t) => t.fired).sort((x, y) => y.points - x.points).slice(0, 2);
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{s.name}</span>
            <span className="metric text-[10px] text-white/40">{s.etf}</span>
            <PhaseBadge phase={a.phase} />
          </div>
          <p className="mt-1 text-xs text-white/50">{a.verdict}</p>
        </div>
        <div className="text-right">
          <span className="label">Exit</span>
          <div className="metric text-xl font-semibold" style={{ color: exitColor(a.exitScore) }}>
            {a.exitScore}
          </div>
        </div>
      </div>
      <div className="mt-2 space-y-1">
        {top.map((t) => (
          <div key={t.key} className="flex items-start gap-2 text-[11px] text-white/45">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
            <span>{t.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
