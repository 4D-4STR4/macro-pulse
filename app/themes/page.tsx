import { getMarketData } from "@/lib/data/provider";
import { themeAnalysisFor } from "@/lib/themesService";
import { ThemesBoard } from "@/app/components/ThemesBoard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Themes · MacroPulse" };

export default async function ThemesPage() {
  const market = await getMarketData();
  const themeMA = await themeAnalysisFor(market);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Themes</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-white/50">
          Cross-cutting market narratives, scored like sectors. The wave a stock actually rides —
          often more telling than its GICS sector. Click any theme to dig in.
        </p>
      </header>

      {themeMA ? (
        <ThemesBoard analysis={themeMA} live={!market.themes?.length} />
      ) : (
        <div className="card p-6 text-sm text-white/50">
          Theme data isn&apos;t available for the current data source.
        </div>
      )}
    </main>
  );
}
