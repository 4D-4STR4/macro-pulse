"use client";

// A small star button for marking a sector as held/watched. Designed to slot
// into a SectorTable cell — compact, accessible, amber when active.

import { useWatchlist } from "./useWatchlist";

const AMBER = "#f59e0b";

export function StarToggle({ sectorId }: { sectorId: string }) {
  const { has, toggle, ready } = useWatchlist();
  const active = ready && has(sectorId);

  return (
    <button
      type="button"
      onClick={() => toggle(sectorId)}
      aria-pressed={active}
      aria-label={active ? "Remove from watchlist" : "Add to watchlist"}
      title={active ? "Watching — click to remove" : "Track this sector"}
      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-sm leading-none transition-colors hover:bg-white/5"
      style={{ color: active ? AMBER : "rgba(255,255,255,0.30)" }}
    >
      <span aria-hidden style={active ? { filter: `drop-shadow(0 0 4px ${AMBER}66)` } : undefined}>
        {active ? "★" : "☆"}
      </span>
    </button>
  );
}
