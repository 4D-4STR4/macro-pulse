import Link from "next/link";
import type { SectorAnalysis } from "@/lib/types";
import { Gauge, PhaseBadge, ConvictionBadge } from "../primitives";
import { heatColor, exitColor } from "@/lib/ui";

/**
 * Deep-dive page header: identity + the two headline gauges (Heat, Exit) and
 * the at-a-glance badges (phase + conviction). Mirrors the dark-theme styling
 * of the home hero.
 */
export function SectorHeader({ a }: { a: SectorAnalysis }) {
  const s = a.sector;
  return (
    <section className="card overflow-hidden p-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-white/45 transition-colors hover:text-white/80"
      >
        <span aria-hidden>←</span> Back to dashboard
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-3xl font-bold tracking-tight text-white">{s.name}</h1>
            <span className="metric rounded-md bg-white/10 px-1.5 py-0.5 text-xs text-white/60">
              {s.etf}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-snug text-white/50">{s.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
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
  );
}
