"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CountUp } from "../motion";

/** Radial 0-100 gauge whose arc sweeps in and value counts up on reveal. */
export function AnimatedGauge({
  value,
  color,
  label,
  sub,
  size = 132,
}: {
  value: number;
  color: string;
  label?: string;
  sub?: string;
  size?: number;
}) {
  const reduce = useReducedMotion();
  const v = Math.max(0, Math.min(100, value));
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arc = 0.75; // 270° sweep
  const filled = (v / 100) * arc;
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
          strokeDasharray={`${c * arc} ${c}`}
          strokeLinecap="round"
        />
        <motion.circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * filled} ${c}`}
          initial={reduce ? false : { strokeDasharray: `0 ${c}` }}
          whileInView={{ strokeDasharray: `${c * filled} ${c}` }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 7px ${color}66)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span style={{ color }}>
          <CountUp value={v} className="metric text-3xl font-semibold" />
        </span>
        {label && <span className="label mt-0.5">{label}</span>}
        {sub && <span className="text-[10px] text-white/40">{sub}</span>}
      </div>
    </div>
  );
}
