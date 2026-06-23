import Link from "next/link";
import type { SectorAnalysis } from "@/lib/types";
import { Gauge, ScoreBar, Sparkline, PhaseBadge, Delta, ConvictionBadge, ConvictionFactors } from "./primitives";
import { WaveLifecycle } from "./WaveLifecycle";
import { PHASE_META, heatColor, exitColor } from "@/lib/ui";

/**
 * The hero: the single hottest wave right now, with the full read —
 * heat, phase, why it's hot, and the exit checklist that tells you when to
 * hop off.
 */
export function HottestWave({ a }: { a: SectorAnalysis }) {
  const s = a.sector;
  const phaseMeta = PHASE_META[a.phase];
  const price = s.history.map((p) => p.price);
  const social = s.history.map((p) => p.socialDominance);
  const firedTriggers = a.exitTriggers.filter((t) => t.fired).sort((x, y) => y.points - x.points);

  return (
    <section className="card overflow-hidden">
      <div className="grid gap-6 p-6 lg:grid-cols-[auto,1fr,1fr]">
        {/* Heat gauge + identity */}
        <div className="flex flex-col items-center justify-center gap-3 lg:items-start">
          <div className="flex items-center gap-2">
            <span className="label">The current wave</span>
          </div>
          <div className="flex items-center gap-4">
            <Gauge value={a.heatScore} color={heatColor(a.heatScore)} label="Heat" sub="0–100" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-semibold text-white">{s.name}</h2>
                <span className="metric rounded-md bg-white/10 px-1.5 py-0.5 text-xs text-white/60">
                  {s.etf}
                </span>
              </div>
              <p className="mt-1 max-w-[22ch] text-xs leading-snug text-white/45">{s.description}</p>
              <div className="mt-2 flex items-center gap-2">
                <PhaseBadge phase={a.phase} confidence={a.phaseConfidence} />
                <Link
                  href={`/sectors/${s.id}`}
                  className="text-xs text-sky-400/80 transition-colors hover:text-sky-300"
                >
                  Deep dive →
                </Link>
              </div>
            </div>
          </div>
          <div className="mt-1 w-full max-w-xs">
            <WaveLifecycle phase={a.phase} />
          </div>
        </div>

        {/* Why it's hot */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="label">Why it&apos;s leading</span>
            <span className="metric text-xs text-white/50">#{a.heatRank} of all sectors</span>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="label">Conviction</span>
              <ConvictionBadge c={a.conviction} showAgreement />
            </div>
            <ConvictionFactors c={a.conviction} />
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
          <div className="flex items-end justify-between pt-1">
            <div>
              <span className="label">Price</span>
              <div className="metric text-lg text-white">${s.price.toFixed(2)}</div>
            </div>
            <div className="flex gap-3 text-sm">
              <Stat label="1W" v={s.ret1w} />
              <Stat label="1M" v={s.ret1m} />
              <Stat label="3M" v={s.ret3m} />
            </div>
          </div>
          <Sparkline price={price} social={social} width={320} height={56} color={phaseMeta.color} />
          <p className="text-[11px] text-white/40">
            <span className="text-emerald-400/80">━ price</span> ·{" "}
            <span className="text-sky-400/80">▒ attention (social dominance)</span>, last 90 days
          </p>
        </div>

        {/* Exit signal */}
        <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between">
            <span className="label">Hop-off signal</span>
            <span className="metric text-xs" style={{ color: exitColor(a.exitScore) }}>
              {a.exitScore}/100
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(3, a.exitScore)}%`, background: exitColor(a.exitScore) }}
            />
          </div>
          <p className="text-sm font-medium" style={{ color: phaseMeta.color }}>
            {a.verdict}
          </p>
          <div className="space-y-2 pt-1">
            <span className="label">Triggers firing</span>
            {firedTriggers.length === 0 && (
              <p className="text-xs text-white/40">None yet — the wave still has fuel.</p>
            )}
            {firedTriggers.map((t) => (
              <div key={t.key} className="flex gap-2 text-xs">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                <div>
                  <span className="text-white/75">{t.label}</span>
                  <span className="ml-1 text-white/35">+{t.points}</span>
                  <p className="text-[11px] leading-tight text-white/40">{t.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <div className="text-right">
      <div className="label">{label}</div>
      <Delta value={v} />
    </div>
  );
}
