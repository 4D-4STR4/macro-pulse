import type { Metadata } from "next";
import { buildTickerMap } from "@/lib/tickerMap";
import { TickerMapView } from "@/app/components/ticker/TickerMapView";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { symbol: string } }): Promise<Metadata> {
  const sym = decodeURIComponent(params.symbol).toUpperCase();
  return { title: `${sym} — Ticker Map · MacroPulse` };
}

export default async function TickerPage({ params }: { params: { symbol: string } }) {
  const map = await buildTickerMap(decodeURIComponent(params.symbol));
  return <TickerMapView map={map} />;
}
