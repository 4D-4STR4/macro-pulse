"use client";

import { useState } from "react";
import type { SectorAnalysis } from "@/lib/types";
import { PhaseBadge, ConvictionBadge } from "./primitives";
import { WaveLifecycle } from "./WaveLifecycle";
import { heatColor, exitColor, fmtPct } from "@/lib/ui";

type SortKey = "heat" | "conviction" | "exit" | "inflow" | "ret1w" | "ret1m" | "ret3m" | "rs1m";

const COLS: { key: SortKey; label: string; get: (a: SectorAnalysis) => number }[] = [
  { key: "heat", label: "Heat", get: (a) => a.heatScore },
  { key: "conviction", label: "Conv.", get: (a) => a.conviction.score * (a.conviction.direction === "bearish" ? -1 : 1) },
  { key: "exit", label: "Exit", get: (a) => a.exitScore },
  { key: "inflow", label: "Inflow", get: (a) => a.inflowScore },
  { key: "ret1w", label: "1W", get: (a) => a.sector.ret1w },
  { key: "ret1m", label: "1M", get: (a) => a.sector.ret1m },
  { key: "ret3m", label: "3M", get: (a) => a.sector.ret3m },
  { key: "rs1m", label: "RS 1M", get: (a) => a.sector.rs1m },
];

export function SectorTable({ sectors }: { sectors: SectorAnalysis[] }) {
  const [sort, setSort] = useState<SortKey>("heat");
  const [dir, setDir] = useState<1 | -1>(-1);

  const col = COLS.find((c) => c.key === sort)!;
  const rows = [...sectors].sort((a, b) => (col.get(a) - col.get(b)) * dir);

  const onSort = (k: SortKey) => {
    if (k === sort) setDir((d) => (d === 1 ? -1 : 1));
    else {
      setSort(k);
      setDir(-1);
    }
  };

  return (
    <section className="card p-6">
      <h2 className="mb-1 text-lg font-semibold text-white">All Sectors</h2>
      <p className="mb-4 text-xs text-white/45">
        The full board — click a column to sort. Heat ranks the current leaders; Exit flags
        exhaustion; Inflow ranks rotation destinations.
      </p>
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="py-2 pr-3 font-normal text-white/40">Sector</th>
              <th className="py-2 pr-3 font-normal text-white/40">Phase</th>
              {COLS.map((c) => (
                <th key={c.key} className="py-2 pr-3 text-right font-normal">
                  <button
                    onClick={() => onSort(c.key)}
                    className={`metric transition-colors hover:text-white ${
                      sort === c.key ? "text-white" : "text-white/40"
                    }`}
                  >
                    {c.label}
                    {sort === c.key && <span className="ml-0.5">{dir === -1 ? "▾" : "▴"}</span>}
                  </button>
                </th>
              ))}
              <th className="py-2 pl-3 font-normal text-white/40">Lifecycle</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.sector.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="py-2.5 pr-3">
                  <div className="font-medium text-white/90">{a.sector.name}</div>
                  <div className="metric text-[10px] text-white/35">{a.sector.etf}</div>
                </td>
                <td className="py-2.5 pr-3">
                  <PhaseBadge phase={a.phase} />
                </td>
                <td className="py-2.5 pr-3 text-right">
                  <Pill value={a.heatScore} color={heatColor(a.heatScore)} />
                </td>
                <td className="py-2.5 pr-3 text-right">
                  <span className="inline-flex justify-end">
                    <ConvictionBadge c={a.conviction} />
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-right">
                  <Pill value={a.exitScore} color={exitColor(a.exitScore)} />
                </td>
                <td className="py-2.5 pr-3 text-right metric text-white/70">{a.inflowScore}</td>
                <td className="py-2.5 pr-3 text-right">{ret(a.sector.ret1w)}</td>
                <td className="py-2.5 pr-3 text-right">{ret(a.sector.ret1m)}</td>
                <td className="py-2.5 pr-3 text-right">{ret(a.sector.ret3m)}</td>
                <td className="py-2.5 pr-3 text-right">{ret(a.sector.rs1m)}</td>
                <td className="py-2.5 pl-3" style={{ minWidth: 120 }}>
                  <WaveLifecycle phase={a.phase} compact />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Pill({ value, color }: { value: number; color: string }) {
  return (
    <span
      className="metric inline-block rounded-md px-1.5 py-0.5 text-xs"
      style={{ background: `${color}1f`, color }}
    >
      {Math.round(value)}
    </span>
  );
}

function ret(v: number) {
  return (
    <span className={`metric ${v >= 0 ? "text-emerald-400/90" : "text-rose-400/90"}`}>
      {fmtPct(v)}
    </span>
  );
}
