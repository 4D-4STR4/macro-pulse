import { getMarketData } from "@/lib/data/provider";
import { analyzeDaily } from "@/lib/engine";
import { SectorTable } from "@/app/components/SectorTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sectors · MacroPulse" };

export default async function SectorsPage() {
  const market = await getMarketData();
  const analysis = analyzeDaily(market);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Sectors</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-white/50">
          The 11 GICS sectors, ranked and read by the engine. Click any sector for its deep dive.
        </p>
      </header>
      <SectorTable sectors={analysis.sectors} />
    </main>
  );
}
