import type { ConvictionRead } from "@/lib/types";
import { DIRECTION_META, convictionColor } from "@/lib/ui";

/**
 * The conviction "trust dial": the dominant direction, magnitude, agreement and
 * a plain-language summary, plus every factor with its directional bar so you
 * can see exactly which independent signals agree or disagree.
 */
export function ConvictionPanel({ c }: { c: ConvictionRead }) {
  const headColor = convictionColor(c.direction, c.score);
  const d = DIRECTION_META[c.direction];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="label">Conviction</span>
        <span className="metric text-xs text-white/40">{c.agreement}% aligned</span>
      </div>

      <div className="mt-3 flex items-baseline gap-3">
        <span className="metric text-4xl font-semibold" style={{ color: headColor }}>
          {c.score}
        </span>
        <span className="chip border" style={{ background: `${headColor}14`, borderColor: `${headColor}44`, color: headColor }}>
          <span>{d.arrow}</span>
          {d.label}
        </span>
      </div>

      <p className="mt-2 text-sm text-white/55">{c.summary}</p>

      <div className="mt-4 space-y-3">
        {c.factors.map((f) => {
          const bullish = f.dir > 0.08;
          const bearish = f.dir < -0.08;
          const col = bullish ? "#22c55e" : bearish ? "#ef4444" : "#71717a";
          const tag = bullish ? "Bullish" : bearish ? "Bearish" : "Neutral";
          // dir is in [-1, +1]; map magnitude to half-width fill either side of center.
          const pct = Math.min(100, Math.abs(f.dir) * 100);
          return (
            <div key={f.key} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-white/70">{f.label}</span>
                <span className="metric text-[11px]" style={{ color: col }}>
                  {tag}
                </span>
              </div>
              {/* center-anchored bar: bullish fills right, bearish fills left */}
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="absolute inset-y-0 left-1/2 w-px bg-white/20" />
                <div
                  className="absolute inset-y-0 rounded-full"
                  style={{
                    background: col,
                    width: `${pct / 2}%`,
                    ...(bearish ? { right: "50%" } : { left: "50%" }),
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
