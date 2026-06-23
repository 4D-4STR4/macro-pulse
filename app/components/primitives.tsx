import type { ConvictionRead, WavePhase } from "@/lib/types";
import { PHASE_META, DIRECTION_META, convictionColor } from "@/lib/ui";

/** Radial 0-100 gauge with a value in the center. */
export function Gauge({
  value,
  color,
  label,
  size = 132,
  sub,
}: {
  value: number;
  color: string;
  label?: string;
  size?: number;
  sub?: string;
}) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pctArc = 0.75; // 270° sweep
  const filled = (Math.max(0, Math.min(100, value)) / 100) * pctArc;
  const cx = size / 2;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-[225deg]">
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
          strokeDasharray={`${c * pctArc} ${c}`}
          strokeLinecap="round"
        />
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${c * filled} ${c}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="metric text-3xl font-semibold" style={{ color }}>
          {Math.round(value)}
        </span>
        {label && <span className="label mt-0.5">{label}</span>}
        {sub && <span className="text-[10px] text-white/40">{sub}</span>}
      </div>
    </div>
  );
}

/** A labelled 0-100 horizontal score bar. */
export function ScoreBar({
  label,
  value,
  detail,
  color = "#38bdf8",
  weight,
}: {
  label: string;
  value: number;
  detail?: string;
  color?: string;
  weight?: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-white/70">
          {label}
          {weight != null && <span className="ml-1 text-white/30">·{Math.round(weight * 100)}%</span>}
        </span>
        <span className="metric text-xs text-white/80">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${Math.max(2, value)}%`, background: color }} />
      </div>
      {detail && <p className="text-[11px] leading-tight text-white/40">{detail}</p>}
    </div>
  );
}

/**
 * Sparkline that overlays price (line) and an optional secondary series
 * (attention, area). Each series is min-max normalized to its own range.
 */
export function Sparkline({
  price,
  social,
  width = 260,
  height = 64,
  color = "#22c55e",
}: {
  price: number[];
  social?: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  const pad = 3;
  const norm = (arr: number[]) => {
    const lo = Math.min(...arr);
    const hi = Math.max(...arr);
    const span = hi - lo || 1;
    return arr.map((v) => (v - lo) / span);
  };
  const toPath = (arr: number[]) => {
    const n = norm(arr);
    return n
      .map((v, i) => {
        const x = pad + (i / (n.length - 1)) * (width - pad * 2);
        const y = height - pad - v * (height - pad * 2);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  };
  const socialArea = () => {
    const n = norm(social!);
    const pts = n
      .map((v, i) => {
        const x = pad + (i / (n.length - 1)) * (width - pad * 2);
        const y = height - pad - v * (height - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    return `M${pad},${height - pad} L${pts} L${width - pad},${height - pad} Z`;
  };
  return (
    <svg width={width} height={height} className="overflow-visible">
      {social && (
        <path d={socialArea()} fill="rgba(56,189,248,0.12)" stroke="rgba(56,189,248,0.5)" strokeWidth={1} />
      )}
      <path d={toPath(price)} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  );
}

export function PhaseBadge({ phase, confidence }: { phase: WavePhase; confidence?: number }) {
  const m = PHASE_META[phase];
  return (
    <span
      className="chip border"
      style={{ background: `${m.color}1a`, borderColor: `${m.color}55`, color: m.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
      {confidence != null && <span className="opacity-60">· {confidence}%</span>}
    </span>
  );
}

/** Compact conviction badge: direction arrow + score, colored by trust. */
export function ConvictionBadge({ c, showAgreement = false }: { c: ConvictionRead; showAgreement?: boolean }) {
  const color = convictionColor(c.direction, c.score);
  const d = DIRECTION_META[c.direction];
  return (
    <span
      className="chip border"
      style={{ background: `${color}14`, borderColor: `${color}44`, color }}
      title={c.summary}
    >
      <span>{d.arrow}</span>
      <span className="metric">{c.score}</span>
      {showAgreement && <span className="opacity-60">· {c.agreement}% aligned</span>}
    </span>
  );
}

/** Five-dot conviction strip showing each factor's direction. */
export function ConvictionFactors({ c }: { c: ConvictionRead }) {
  return (
    <div className="flex items-center gap-1" title={c.summary}>
      {c.factors.map((f) => {
        const col = f.dir > 0.08 ? "#22c55e" : f.dir < -0.08 ? "#ef4444" : "#52525b";
        const h = 4 + Math.round(Math.abs(f.dir) * 10);
        return (
          <span key={f.key} className="flex h-3.5 w-1.5 items-end" title={`${f.label}: ${f.dir}`}>
            <span className="w-full rounded-sm" style={{ height: `${h}px`, background: col }} />
          </span>
        );
      })}
    </div>
  );
}

export function Delta({ value, dp = 1 }: { value: number; dp?: number }) {
  const up = value >= 0;
  return (
    <span className={`metric ${up ? "text-emerald-400" : "text-rose-400"}`}>
      {up ? "+" : ""}
      {value.toFixed(dp)}%
    </span>
  );
}
