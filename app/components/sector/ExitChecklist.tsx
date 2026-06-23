import type { ExitTrigger } from "@/lib/types";
import { exitColor } from "@/lib/ui";

/**
 * The full hop-off checklist: every exhaustion trigger — fired and dormant —
 * with its point contribution and reason, plus the headline exit score and the
 * plain-language verdict as a callout. Fired triggers sort to the top.
 */
export function ExitChecklist({
  triggers,
  exitScore,
  verdict,
  verdictColor,
}: {
  triggers: ExitTrigger[];
  exitScore: number;
  verdict: string;
  verdictColor: string;
}) {
  const sorted = [...triggers].sort((a, b) => {
    if (a.fired !== b.fired) return a.fired ? -1 : 1;
    return b.points - a.points;
  });
  const firedCount = triggers.filter((t) => t.fired).length;
  const col = exitColor(exitScore);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="label">Hop-off checklist</span>
        <span className="metric text-xs text-white/40">
          {firedCount}/{triggers.length} firing
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-3">
        <span className="metric text-4xl font-semibold" style={{ color: col }}>
          {exitScore}
        </span>
        <span className="label">exit score · 0–100</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(3, exitScore)}%`, background: col }}
        />
      </div>

      <div
        className="mt-4 rounded-lg border px-3 py-2 text-sm font-medium"
        style={{ borderColor: `${verdictColor}44`, background: `${verdictColor}12`, color: verdictColor }}
      >
        {verdict}
      </div>

      <ul className="mt-4 space-y-3">
        {sorted.map((t) => (
          <li key={t.key} className="flex gap-2.5">
            <span
              className="mt-1 h-2 w-2 shrink-0 rounded-full"
              style={{
                background: t.fired ? exitColor(Math.max(50, t.points * 4)) : "#52525b",
                boxShadow: t.fired ? `0 0 6px ${exitColor(Math.max(50, t.points * 4))}aa` : undefined,
              }}
            />
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className={`text-sm ${t.fired ? "text-white/85" : "text-white/45"}`}>
                  {t.label}
                </span>
                <span className="metric text-[11px] text-white/35">+{t.points}</span>
                {!t.fired && <span className="text-[10px] uppercase tracking-wide text-white/25">dormant</span>}
              </div>
              <p className="text-[11px] leading-tight text-white/40">{t.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
