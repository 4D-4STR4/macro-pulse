"use client";

import type { MarketAnalysis } from "@/lib/types";
import { Reveal } from "../motion";
import { PulseHero } from "./PulseHero";
import { StatStrip } from "./StatStrip";
import { HottestWave } from "../HottestWave";
import { RotationMap } from "../RotationMap";
import { ThemesBoard } from "../ThemesBoard";
import { Playbook } from "../Playbook";
import { WatchlistPanel } from "../watchlist/WatchlistPanel";
import { SectorTable } from "../SectorTable";

/**
 * The animated dashboard body. Receives fully-serialized analysis from the
 * server page and renders the reorganized, motion-driven layout:
 *   Pulse → key stats → the current wave → rotation → themes → playbook →
 *   your watchlist → full board.
 */
export function DashboardView({
  analysis,
  themeAnalysis,
  themesLive,
}: {
  analysis: MarketAnalysis;
  themeAnalysis: MarketAnalysis | null;
  themesLive: boolean;
}) {
  return (
    <div className="space-y-6">
      <PulseHero analysis={analysis} />
      <StatStrip analysis={analysis} />

      <Reveal>
        <HottestWave a={analysis.hottest} />
      </Reveal>

      <Reveal>
        <RotationMap analysis={analysis} />
      </Reveal>

      {themeAnalysis && (
        <Reveal>
          <ThemesBoard analysis={themeAnalysis} live={themesLive} />
        </Reveal>
      )}

      <Reveal>
        <Playbook nextWave={analysis.nextWave} exiting={analysis.exiting} />
      </Reveal>

      <Reveal>
        <WatchlistPanel sectors={analysis.sectors} />
      </Reveal>

      <Reveal>
        <SectorTable sectors={analysis.sectors} />
      </Reveal>
    </div>
  );
}
