"use client";

// The trader's personal panel. Filters the full market read down to the
// sectors they've starred and surfaces a prominent exit alert the moment one
// of their positions tops. Sectors arrive already analyzed from the server
// page — only the filtering and rendering happen client-side.

import type { SectorAnalysis } from "@/lib/types";
import { PhaseBadge, ConvictionBadge } from "../primitives";
import { heatColor, exitColor } from "@/lib/ui";
import { useWatchlist } from "./useWatchlist";

const AMBER = "#f59e0b";
const RED = "#ef4444";

/** A watched sector counts as "in trouble" when its wave is topping or
 *  the exit score is flashing. Drives both alert styling and the summary. */
function isTroubled(a: SectorAnalysis): boolean {
  return a.exitScore >= 55 || a.phase === "distribution" || a.phase === "decline";
}

export function WatchlistPanel({ sectors }: { sectors: SectorAnalysis[] }) {
  const { has, ready } = useWatchlist();

  // Avoid a hydration mismatch: render nothing watched-specific until mounted.
  // Keep the shell so layout doesn't jump.
  const watched = ready ? sectors.filter((a) => has(a.sector.id)) : [];

  // Troubled positions float to the top, then by exit score descending.
  const rows = [...watched].sort((a, b) => {
    const ta = isTroubled(a) ? 1 : 0;
    const tb = isTroubled(b) ? 1 : 0;
    if (ta !== tb) return tb - ta;
    return b.exitScore - a.exitScore;
  });

  const flashing = rows.filter(isTroubled).length;

  return (
    <section className="card p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span aria-hidden style={{ color: AMBER }}>
            ★
          </span>
          <h2 className="text-lg font-semibold text-white">Your Watchlist</h2>
        </div>
        {ready && rows.length > 0 && (
          <span className="metric text-[11px] text-white/40">
            {rows.length} position{rows.length === 1 ? "" : "s"}
            {flashing > 0 && (
              <>
                {" "}·{" "}
                <span style={{ color: RED }}>{flashing} flashing exit</span>
              </>
            )}
          </span>
        )}
      </div>

      {!ready || rows.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-2.5">
          {rows.map((a) => (
            <PositionRow key={a.sector.id} a={a} />
          ))}
        </ul>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
      <p className="text-sm text-white/70">
        Star a sector below to track it here — you&apos;ll get an exit alert the moment your
        position&apos;s wave tops.
      </p>
      <p className="mt-1 text-[11px] text-white/35">
        Tap the ☆ in any row of the sector board to add it.
      </p>
    </div>
  );
}

function PositionRow({ a }: { a: SectorAnalysis }) {
  const troubled = isTroubled(a);

  return (
    <li
      className="rounded-xl border p-3"
      style={
        troubled
          ? { background: `${RED}0f`, borderColor: `${RED}40` }
          : { background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-medium text-white/90">{a.sector.name}</span>
            <span className="metric text-[10px] text-white/35">{a.sector.etf}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PhaseBadge phase={a.phase} />
          <ConvictionBadge c={a.conviction} />
          <Metric label="Heat" value={a.heatScore} color={heatColor(a.heatScore)} />
          <Metric label="Exit" value={a.exitScore} color={exitColor(a.exitScore)} />
        </div>
      </div>

      {troubled && (
        <div
          className="mt-2.5 flex items-start gap-2 rounded-lg px-2.5 py-1.5"
          style={{ background: `${RED}1a`, color: "#fecaca" }}
          role="alert"
        >
          <span aria-hidden className="mt-px shrink-0" style={{ color: AMBER }}>
            ⚠
          </span>
          <p className="text-[12px] leading-snug">
            Exit signal on your <span className="font-semibold text-white/90">{a.sector.name}</span>{" "}
            position — {a.verdict}
          </p>
        </div>
      )}
    </li>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-[10px] uppercase tracking-wider text-white/35">{label}</span>
      <span
        className="metric inline-block rounded-md px-1.5 py-0.5 text-xs"
        style={{ background: `${color}1f`, color }}
      >
        {Math.round(value)}
      </span>
    </span>
  );
}
