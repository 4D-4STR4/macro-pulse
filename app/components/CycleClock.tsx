import type { CycleRead } from "@/lib/types";
import { CYCLE_META } from "@/lib/ui";

const STAGES = [
  { key: "early", label: "Early", a0: -90, a1: 0 },
  { key: "mid", label: "Mid", a0: 0, a1: 90 },
  { key: "late", label: "Late", a0: 90, a1: 180 },
  { key: "recession", label: "Defensive", a0: 180, a1: 270 },
] as const;

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
};

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
}

/**
 * Business-cycle clock. Sector leadership rotates with the cycle in a fixed
 * order; we highlight the inferred stage and point at the next one.
 */
export function CycleClock({ cycle }: { cycle: CycleRead }) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 6;
  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} className="shrink-0">
        {STAGES.map((st) => {
          const active = st.key === cycle.stage;
          const next = st.key === cycle.nextStage;
          const color = CYCLE_META[st.key].color;
          const [lx, ly] = polar(cx, cy, r * 0.62, (st.a0 + st.a1) / 2);
          return (
            <g key={st.key}>
              <path
                d={arc(cx, cy, r, st.a0, st.a1)}
                fill={active ? `${color}33` : next ? `${color}1a` : "rgba(255,255,255,0.03)"}
                stroke={active ? color : "rgba(255,255,255,0.08)"}
                strokeWidth={active ? 2 : 1}
              />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fill={active ? color : "rgba(255,255,255,0.5)"}
                fontWeight={active ? 700 : 400}
              >
                {st.label}
              </text>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={3} fill="white" opacity={0.6} />
      </svg>
      <div>
        <span className="label">Inferred cycle stage</span>
        <h3 className="mt-1 text-lg font-semibold" style={{ color: CYCLE_META[cycle.stage].color }}>
          {cycle.label}
          <span className="ml-2 metric text-xs text-white/40">{cycle.confidence}% fit</span>
        </h3>
        <p className="mt-1 max-w-md text-xs leading-snug text-white/55">{cycle.description}</p>
        <p className="mt-2 text-xs text-white/45">
          Clock points next to{" "}
          <span style={{ color: CYCLE_META[cycle.nextStage].color }}>
            {STAGES.find((s) => s.key === cycle.nextStage)?.label.toLowerCase()}-cycle
          </span>{" "}
          leadership.
        </p>
      </div>
    </div>
  );
}
