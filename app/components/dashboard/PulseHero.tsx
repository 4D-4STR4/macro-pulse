"use client";

import { Radio, ArrowUpRight, ArrowDownRight, Minus, type LucideIcon } from "lucide-react";
import type { MarketAnalysis, SignalChange } from "@/lib/types";
import { motion } from "../motion";
import { POSTURE_COLOR } from "@/lib/ui";

const EASE = [0.22, 1, 0.36, 1] as const;
const DIR: Record<string, { icon: LucideIcon; color: string }> = {
  bullish: { icon: ArrowUpRight, color: "#22c55e" },
  bearish: { icon: ArrowDownRight, color: "#ef4444" },
  neutral: { icon: Minus, color: "#a1a1aa" },
};

export function PulseHero({ analysis }: { analysis: MarketAnalysis }) {
  const b = analysis.briefing;
  const changes = analysis.changes ?? [];
  const posture = analysis.posture;
  const postureColor = POSTURE_COLOR[posture.label] ?? "#a1a1aa";
  const bull = changes.filter((c) => c.direction === "bullish").length;
  const bear = changes.filter((c) => c.direction === "bearish").length;
  const date = new Date(analysis.asOf).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <motion.section
      className="card relative overflow-hidden"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      {/* ambient gradient wash */}
      <div className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: `radial-gradient(600px 240px at 12% -20%, ${postureColor}22, transparent 60%)` }} />

      <div className="relative grid gap-0 lg:grid-cols-[1.45fr,1fr]">
        {/* Briefing */}
        <div className="border-b border-white/10 p-6 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="icon-tile" style={{ background: "#22c55e1a", borderColor: "#22c55e44", color: "#22c55e" }}>
                <Radio size={16} strokeWidth={2.4} />
              </span>
              <span className="label">Daily Pulse · {date}</span>
            </div>
            <span className="chip border" style={{ background: `${postureColor}1a`, borderColor: `${postureColor}55`, color: postureColor }}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: postureColor }} />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: postureColor }} />
              </span>
              {posture.label}
            </span>
          </div>

          <motion.h2
            className="mt-4 text-2xl font-bold leading-tight gradient-text"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
          >
            {b?.headline}
          </motion.h2>
          <p className="mt-3 text-sm leading-relaxed text-white/60">{b?.narrative}</p>
          <p className="mt-3 text-[11px] text-white/35">{posture.detail}</p>
        </div>

        {/* What changed */}
        <div className="p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="label">What changed today</span>
            <span className="metric text-[11px] text-white/40">
              {changes.length} move{changes.length === 1 ? "" : "s"} ·{" "}
              <span className="text-emerald-400/80">{bull}↑</span>{" "}
              <span className="text-rose-400/80">{bear}↓</span>
            </span>
          </div>

          {changes.length === 0 ? (
            <p className="text-sm text-white/40">Quiet tape — no phase flips, exits or rotations since the prior read.</p>
          ) : (
            <ul className="space-y-2">
              {changes.slice(0, 5).map((c, i) => (
                <ChangeRow key={`${c.id}-${c.type}-${i}`} c={c} i={i} />
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
    </motion.section>
  );
}

function ChangeRow({ c, i }: { c: SignalChange; i: number }) {
  const d = DIR[c.direction] ?? DIR.neutral;
  const Icon = d.icon;
  return (
    <motion.li
      className="group flex items-start gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-white/[0.04]"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.15 + i * 0.07, ease: EASE }}
    >
      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
        style={{ background: `${d.color}1f`, color: d.color }}>
        <Icon size={13} strokeWidth={2.6} />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-medium leading-tight text-white/85">{c.headline}</p>
        <p className="truncate text-[11px] leading-tight text-white/40">{c.detail}</p>
      </div>
      <span className="metric ml-auto shrink-0 text-[10px] text-white/30">{c.severity}</span>
    </motion.li>
  );
}
