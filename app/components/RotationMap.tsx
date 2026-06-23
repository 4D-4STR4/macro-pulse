import { Shuffle } from "lucide-react";
import type { MarketAnalysis } from "@/lib/types";
import { CycleClock } from "./CycleClock";
import { PHASE_META } from "@/lib/ui";

/**
 * Rotation map: where capital is leaving and where it's heading next, combining
 * the data-driven flow (exit signal -> inflow score) with the cycle clock.
 */
export function RotationMap({ analysis }: { analysis: MarketAnalysis }) {
  const byId = new Map(analysis.sectors.map((s) => [s.sector.id, s]));
  return (
    <section className="card p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <span className="icon-tile h-7 w-7" style={{ background: "#38bdf81a", borderColor: "#38bdf844", color: "#38bdf8" }}>
              <Shuffle size={15} strokeWidth={2.4} />
            </span>
            Rotation Map
          </h2>
          <p className="text-xs text-white/45">
            Predicted capital flow — out of exhausting waves, into the next ones.
          </p>
        </div>
        <CycleClock cycle={analysis.cycle} />
      </div>

      <div className="space-y-2.5">
        {analysis.rotations.map((edge, i) => {
          const from = byId.get(edge.fromId);
          const to = byId.get(edge.toId);
          if (!from || !to) return null;
          return (
            <div
              key={`${edge.fromId}-${edge.toId}-${i}`}
              className="grid grid-cols-[1fr,auto,1fr] items-center gap-3 rounded-xl border border-white/5 bg-black/20 p-3"
            >
              <SectorPill
                name={from.sector.name}
                etf={from.sector.etf}
                color={PHASE_META[from.phase].color}
                sub={`exit ${from.exitScore}`}
                align="left"
              />
              <div className="flex flex-col items-center gap-1">
                <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-400/60 to-emerald-400"
                    style={{ width: `${edge.strength}%` }}
                  />
                </div>
                <span className="metric text-[10px] text-white/40">{edge.strength}% flow</span>
              </div>
              <SectorPill
                name={to.sector.name}
                etf={to.sector.etf}
                color={PHASE_META[to.phase].color}
                sub={`inflow ${to.inflowScore}`}
                align="right"
              />
              <p className="col-span-3 text-[11px] leading-tight text-white/35">{edge.rationale}</p>
            </div>
          );
        })}
        {analysis.rotations.length === 0 && (
          <p className="text-sm text-white/40">No strong rotation signals right now — trend intact.</p>
        )}
      </div>
    </section>
  );
}

function SectorPill({
  name,
  etf,
  color,
  sub,
  align,
}: {
  name: string;
  etf: string;
  color: string;
  sub: string;
  align: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <div className={`flex items-center gap-2 ${align === "right" ? "justify-end" : ""}`}>
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        <span className="text-sm font-medium text-white/90">{name}</span>
        <span className="metric text-[10px] text-white/40">{etf}</span>
      </div>
      <span className="metric text-[10px] text-white/35">{sub}</span>
    </div>
  );
}
