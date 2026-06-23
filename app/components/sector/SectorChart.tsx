import type { SectorHistoryPoint } from "@/lib/types";

/**
 * A large price-vs-attention chart over the full history.
 *
 * Price is drawn as a line; social dominance ("attention") as a filled area.
 * Each series is min-max normalized to its own range so the shapes are
 * comparable even though their absolute scales differ. A few date ticks and
 * the price min/max labels keep it readable.
 *
 * Pure SVG — renders fine on the server (no "use client" needed).
 */
export function SectorChart({
  history,
  color = "#22c55e",
  height = 220,
}: {
  history: SectorHistoryPoint[];
  color?: string;
  height?: number;
}) {
  const width = 720;
  const padX = 8;
  const padTop = 14;
  const padBottom = 22; // room for date ticks

  const price = history.map((p) => p.price);
  const social = history.map((p) => p.socialDominance);
  const n = history.length;

  const loP = Math.min(...price);
  const hiP = Math.max(...price);
  const loS = Math.min(...social);
  const hiS = Math.max(...social);
  const spanP = hiP - loP || 1;
  const spanS = hiS - loS || 1;

  const plotH = height - padTop - padBottom;
  const x = (i: number) => padX + (i / Math.max(1, n - 1)) * (width - padX * 2);
  const yP = (v: number) => padTop + (1 - (v - loP) / spanP) * plotH;
  const yS = (v: number) => padTop + (1 - (v - loS) / spanS) * plotH;

  const pricePath = price
    .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yP(v).toFixed(1)}`)
    .join(" ");

  const socialPts = social.map((v, i) => `${x(i).toFixed(1)},${yS(v).toFixed(1)}`).join(" ");
  const socialArea = `M${padX},${padTop + plotH} L${socialPts} L${(width - padX).toFixed(1)},${
    padTop + plotH
  } Z`;

  // ~5 evenly-spaced date ticks
  const tickCount = Math.min(5, n);
  const tickIdx = Array.from({ length: tickCount }, (_, k) =>
    Math.round((k / Math.max(1, tickCount - 1)) * (n - 1)),
  );
  const fmtTick = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const gid = `sec-grad-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      style={{ maxWidth: width, height: "auto" }}
      className="block"
      role="img"
      aria-label="Price versus attention over the full history"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* attention (social dominance) area */}
      <path d={socialArea} fill={`url(#${gid})`} stroke="rgba(56,189,248,0.45)" strokeWidth={1} />

      {/* price line */}
      <path
        d={pricePath}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 5px ${color}55)` }}
      />

      {/* price min/max labels (right edge) */}
      <text x={width - padX} y={yP(hiP) - 4} textAnchor="end" className="fill-white/55" fontSize={10}>
        ${hiP.toFixed(2)}
      </text>
      <text
        x={width - padX}
        y={Math.min(padTop + plotH, yP(loP) + 11)}
        textAnchor="end"
        className="fill-white/40"
        fontSize={10}
      >
        ${loP.toFixed(2)}
      </text>

      {/* date ticks */}
      {tickIdx.map((i, k) => (
        <text
          key={i}
          x={x(i)}
          y={height - 6}
          textAnchor={k === 0 ? "start" : k === tickIdx.length - 1 ? "end" : "middle"}
          className="fill-white/35"
          fontSize={10}
        >
          {fmtTick(history[i].date)}
        </text>
      ))}
    </svg>
  );
}
