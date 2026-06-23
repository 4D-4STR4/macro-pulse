import type { MarketAnalysis, SignalChange } from "@/lib/types";
import { DIRECTION_META, POSTURE_COLOR } from "@/lib/ui";

/**
 * The Daily Pulse — the first thing a trader sees. A synthesized headline +
 * narrative, the overall tape posture, and a ranked feed of what changed since
 * the prior read. This is the daily-habit hook: open it to see what moved.
 */
export function DailyPulse({ analysis }: { analysis: MarketAnalysis }) {
  const b = analysis.briefing;
  const changes = analysis.changes ?? [];
  const posture = analysis.posture;
  const postureColor = POSTURE_COLOR[posture.label] ?? "#a1a1aa";
  const date = new Date(analysis.asOf).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const bullish = changes.filter((c) => c.direction === "bullish").length;
  const bearish = changes.filter((c) => c.direction === "bearish").length;

  return (
    <section className="card overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[1.4fr,1fr]">
        {/* Briefing */}
        <div className="border-b border-white/10 p-6 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="label">Daily Pulse · {date}</span>
            </div>
            <span
              className="chip border"
              style={{ background: `${postureColor}1a`, borderColor: `${postureColor}55`, color: postureColor }}
            >
              {posture.label}
            </span>
          </div>

          <h2 className="mt-3 text-xl font-semibold leading-snug text-white">{b?.headline}</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/60">{b?.narrative}</p>
          <p className="mt-3 text-[11px] text-white/35">{posture.detail}</p>
        </div>

        {/* What changed */}
        <div className="p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="label">What changed today</span>
            <span className="metric text-[11px] text-white/40">
              {changes.length} move{changes.length === 1 ? "" : "s"}
              {changes.length > 0 && (
                <>
                  {" "}· <span className="text-emerald-400/80">{bullish}↑</span>{" "}
                  <span className="text-rose-400/80">{bearish}↓</span>
                </>
              )}
            </span>
          </div>

          {changes.length === 0 ? (
            <p className="text-sm text-white/40">
              Quiet tape — no phase flips, exits or rotations since the prior read.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {changes.slice(0, 5).map((c, i) => (
                <ChangeRow key={`${c.id}-${c.type}-${i}`} c={c} />
              ))}
            </ul>
          )}
          {analysis.comparedTo && (
            <p className="mt-3 text-[10px] text-white/25">
              vs read from {new Date(analysis.comparedTo).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function ChangeRow({ c }: { c: SignalChange }) {
  const d = DIRECTION_META[c.direction];
  return (
    <li className="flex items-start gap-2.5">
      <span
        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px]"
        style={{ background: `${d.color}1f`, color: d.color }}
        title={d.label}
      >
        {d.arrow}
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-medium leading-tight text-white/85">{c.headline}</p>
        <p className="truncate text-[11px] leading-tight text-white/40">{c.detail}</p>
      </div>
      <span className="metric ml-auto shrink-0 text-[10px] text-white/30">{c.severity}</span>
    </li>
  );
}
