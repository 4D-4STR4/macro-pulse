import Link from "next/link";
import type { MarketAnalysis } from "@/lib/types";
import { unitRole } from "@/lib/engine/ticker";
import { PhaseBadge, Sparkline, Delta } from "./primitives";
import { ROLE_META, heatColor } from "@/lib/ui";

/**
 * Hot Themes board — cross-cutting narratives ranked by heat, scored with the
 * same engine as sectors. Themes are often the real driver of a name, so this
 * sits alongside the sector board on the dashboard.
 */
export function ThemesBoard({ analysis, live }: { analysis: MarketAnalysis; live: boolean }) {
  const themes = analysis.sectors; // theme analyses, already heat-sorted

  return (
    <section className="card p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white">Hot Themes</h2>
          <p className="text-xs text-white/45">
            Cross-cutting narratives ranked by heat — the wave a stock rides, independent of its sector.
          </p>
        </div>
        <span className="metric text-[11px] text-white/40">
          {live ? "● live · constituent baskets" : "○ snapshot"} · {themes.length} themes
        </span>
      </div>

      <div className="grid gap-2.5 md:grid-cols-2">
        {themes.map((t, i) => {
          const role = unitRole(t, analysis).role;
          const rm = ROLE_META[role] ?? ROLE_META.neutral;
          return (
            <Link
              key={t.sector.id}
              href={`/themes/${t.sector.id}`}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 p-3 transition-colors hover:border-white/15 hover:bg-white/[0.04]"
            >
              <span className="metric w-5 shrink-0 text-center text-xs text-white/30">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-white/90">{t.sector.name}</span>
                  <PhaseBadge phase={t.phase} />
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className="chip border text-[10px]"
                    style={{ background: `${rm.color}1a`, borderColor: `${rm.color}55`, color: rm.color }}
                  >
                    {rm.label}
                  </span>
                  <Delta value={t.sector.ret1m} />
                  <span className="text-[10px] text-white/30">1m</span>
                </div>
              </div>
              <Sparkline
                price={t.sector.history.map((p) => p.price)}
                width={84}
                height={30}
                color={rm.color}
              />
              <div className="w-16 shrink-0 text-right">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(4, t.heatScore)}%`, background: heatColor(t.heatScore) }}
                  />
                </div>
                <span className="metric text-sm font-semibold" style={{ color: heatColor(t.heatScore) }}>
                  {t.heatScore}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
