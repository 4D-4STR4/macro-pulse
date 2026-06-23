"use client";

import { Activity, Flame, Compass, Zap, type LucideIcon } from "lucide-react";
import type { MarketAnalysis } from "@/lib/types";
import { CountUp, motion } from "../motion";
import { POSTURE_COLOR, CYCLE_META, heatColor } from "@/lib/ui";

const EASE = [0.22, 1, 0.36, 1] as const;

interface Stat {
  icon: LucideIcon;
  tint: string;
  label: string;
  value?: string;
  num?: number;
  sub: string;
}

export function StatStrip({ analysis }: { analysis: MarketAnalysis }) {
  const changes = analysis.changes ?? [];
  const bull = changes.filter((c) => c.direction === "bullish").length;
  const bear = changes.filter((c) => c.direction === "bearish").length;
  const hot = analysis.hottest;

  const stats: Stat[] = [
    {
      icon: Activity,
      tint: POSTURE_COLOR[analysis.posture.label] ?? "#a1a1aa",
      label: "Tape posture",
      value: analysis.posture.label,
      sub: `breadth ${analysis.posture.score >= 0 ? "+" : ""}${analysis.posture.score}`,
    },
    {
      icon: Flame,
      tint: heatColor(hot.heatScore),
      label: "Hottest sector",
      value: hot.sector.name,
      sub: `${hot.sector.etf} · heat ${hot.heatScore}`,
    },
    {
      icon: Compass,
      tint: CYCLE_META[analysis.cycle.stage].color,
      label: "Cycle stage",
      value: analysis.cycle.label,
      sub: `${analysis.cycle.confidence}% fit`,
    },
    {
      icon: Zap,
      tint: "#38bdf8",
      label: "Moves today",
      num: changes.length,
      sub: `${bull} up · ${bear} down`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          className="card-interactive relative overflow-hidden p-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: i * 0.07, ease: EASE }}
        >
          <div
            className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-20 blur-2xl"
            style={{ background: s.tint }}
          />
          <div className="flex items-center gap-2.5">
            <span
              className="icon-tile"
              style={{ background: `${s.tint}1a`, borderColor: `${s.tint}44`, color: s.tint }}
            >
              <s.icon size={18} strokeWidth={2.2} />
            </span>
            <span className="label">{s.label}</span>
          </div>
          <div className="mt-3">
            {s.num !== undefined ? (
              <CountUp value={s.num} className="metric text-3xl font-bold text-white" />
            ) : (
              <div className="truncate text-xl font-bold text-white">{s.value}</div>
            )}
            <div className="mt-0.5 text-xs text-white/45">{s.sub}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
