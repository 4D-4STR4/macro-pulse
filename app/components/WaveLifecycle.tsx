import type { WavePhase } from "@/lib/types";
import { PHASE_ORDER, PHASE_META } from "@/lib/ui";

/**
 * The wave lifecycle rail: shows all five phases in order with the sector's
 * current phase highlighted — so a trader instantly sees how much of the wave
 * is behind vs ahead of them.
 */
export function WaveLifecycle({ phase, compact = false }: { phase: WavePhase; compact?: boolean }) {
  const activeOrder = PHASE_META[phase].order;
  return (
    <div className="flex w-full items-stretch gap-1">
      {PHASE_ORDER.map((p) => {
        const m = PHASE_META[p];
        const active = p === phase;
        const passed = m.order < activeOrder;
        return (
          <div key={p} className="flex-1">
            <div
              className="h-1.5 w-full rounded-full transition-all"
              style={{
                background: active ? m.color : passed ? `${m.color}66` : "rgba(255,255,255,0.08)",
                boxShadow: active ? `0 0 8px ${m.color}aa` : undefined,
              }}
            />
            {!compact && (
              <span
                className="mt-1.5 block text-[10px]"
                style={{ color: active ? m.color : "rgba(255,255,255,0.35)" }}
              >
                {m.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
