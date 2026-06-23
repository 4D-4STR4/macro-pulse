import Link from "next/link";
import type { TickerMap } from "@/lib/engine/ticker";
import { Gauge, ScoreBar, PhaseBadge, ConvictionBadge, Delta } from "../primitives";
import { TickerSearch } from "../TickerSearch";
import { ROLE_META, heatColor, exitColor, PHASE_META } from "@/lib/ui";

/** The full Ticker Map result. Keeps stock vs sector vs combined read separate. */
export function TickerMapView({ map }: { map: TickerMap }) {
  const role = ROLE_META[map.role] ?? ROLE_META.unknown;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-sm text-white/50 transition-colors hover:text-white">
          ← Dashboard
        </Link>
        <TickerSearch />
      </div>

      {!map.sector && !map.stock ? (
        <UnknownCard map={map} />
      ) : (
        <div className="space-y-5">
          <HeaderCard map={map} roleColor={role.color} roleLabel={role.label} />
          <div className="grid gap-5 lg:grid-cols-2">
            {map.sector ? <SectorCard map={map} /> : <UnclassifiedSectorCard map={map} />}
            <StockCard map={map} />
          </div>
          {map.themes.length > 0 && <ThemesCard map={map} />}
          <CombinedCard map={map} roleColor={role.color} />
          <Caveats caveats={map.caveats} source={map.dataSource} />
        </div>
      )}
    </main>
  );
}

function HeaderCard({ map, roleColor, roleLabel }: { map: TickerMap; roleColor: string; roleLabel: string }) {
  const c = map.combined;
  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">{map.symbol}</h1>
            <span className="text-sm text-white/50">{map.name}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className="chip border text-sm"
              style={{ background: `${roleColor}1a`, borderColor: `${roleColor}66`, color: roleColor }}
            >
              ● {roleLabel}
            </span>
            {map.classification && (
              <Link
                href={`/sectors/${map.classification.sectorId}`}
                className="chip border border-white/10 bg-white/5 text-white/60 transition-colors hover:text-white"
              >
                {map.classification.sectorName} ({map.classification.sectorEtf}) →
              </Link>
            )}
          </div>
          <p className="mt-3 max-w-xl text-[15px] font-medium leading-snug text-white/85">{c.headline}</p>
          <p className="mt-1 text-sm text-white/45">{map.roleReason}</p>
        </div>

        {map.stock ? (
          <div className="flex flex-col items-center">
            <Gauge value={map.stock.score} color={scoreColor(map.stock.score)} label="Stock score" sub="0–100" />
            <span className="mt-1 text-xs capitalize text-white/45">{map.stock.trend}</span>
          </div>
        ) : (
          <div className="flex w-40 flex-col items-center justify-center rounded-xl border border-dashed border-white/15 p-4 text-center">
            <span className="text-2xl text-white/30">—</span>
            <span className="mt-1 text-[11px] leading-tight text-white/40">
              Stock score needs live data
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3">
        <span className="label">Confidence</span>
        <ConfidenceMeter value={map.combined.confidence} label={map.combined.confidenceLabel} />
      </div>
    </section>
  );
}

function SectorCard({ map }: { map: TickerMap }) {
  const s = map.sector!;
  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Sector context</h2>
        <PhaseBadge phase={s.phase} />
      </div>
      <p className="mb-4 text-xs text-white/45">
        Read from the same engine that powers the dashboard — the sector&apos;s role in the rotation.
      </p>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Heat" value={`${s.heatScore}`} sub={`#${s.heatRank} of ${s.totalSectors}`} color={heatColor(s.heatScore)} />
        <Stat label="Exit" value={`${s.exitScore}`} sub="hop-off" color={exitColor(s.exitScore)} />
        <Stat label="Inflow" value={`${s.inflowScore}`} sub="rotation pull" color="#38bdf8" />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
        <div className="flex items-center gap-2">
          <span className="label">Conviction</span>
          <ConvictionBadge c={{ ...emptyConv(), score: s.conviction.score, direction: s.conviction.direction }} />
        </div>
        <Link href={`/sectors/${s.id}`} className="text-xs text-sky-400/80 hover:text-sky-300">
          Sector deep dive →
        </Link>
      </div>
      <p className="mt-3 text-sm" style={{ color: PHASE_META[s.phase].color }}>{s.verdict}</p>
    </section>
  );
}

function UnclassifiedSectorCard({ map }: { map: TickerMap }) {
  return (
    <section className="card p-5">
      <h2 className="mb-3 text-sm font-semibold text-white">Sector context</h2>
      <div className="rounded-lg border border-dashed border-white/15 bg-black/20 p-4 text-sm text-white/55">
        <p className="font-medium text-white/70">
          {map.fund ? "Fund / ETF — no single sector." : "Sector unclassified."}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-white/45">{map.roleReason}</p>
        <p className="mt-2 text-[11px] text-white/35">
          No sector-rotation role is applied — we don&apos;t assign a sector we can&apos;t confirm.
        </p>
      </div>
    </section>
  );
}

function StockCard({ map }: { map: TickerMap }) {
  if (!map.stock) {
    return (
      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">Stock score</h2>
        <div className="rounded-lg border border-dashed border-white/15 bg-black/20 p-4 text-sm text-white/55">
          <p className="font-medium text-white/70">No stock-specific score shown.</p>
          <p className="mt-1 text-xs leading-relaxed text-white/45">
            The stock&apos;s individual price wasn&apos;t available, so we show sector context only —
            we don&apos;t estimate or fabricate a stock score. Enable live data
            (<span className="metric">MARKET_DATA_PROVIDER=stooq</span>) to score the stock itself
            from its own trend, relative strength, momentum and position.
          </p>
        </div>
      </section>
    );
  }
  const st = map.stock;
  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Stock score — its own strength</h2>
        <span className="metric text-lg font-semibold" style={{ color: scoreColor(st.score) }}>{st.score}</span>
      </div>
      <div className="space-y-2.5">
        {st.factors.map((f) => (
          <ScoreBar key={f.key} label={f.label} value={f.value} weight={f.weight} detail={f.detail} color={scoreColor(f.value)} />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2 border-t border-white/10 pt-3 text-center">
        <MiniStat label="1W" v={st.stats.ret1w} />
        <MiniStat label="1M" v={st.stats.ret1m} />
        <MiniStat label="3M" v={st.stats.ret3m} />
        <MiniStat label="RS 1M" v={st.stats.rs1m} />
      </div>
    </section>
  );
}

function ThemesCard({ map }: { map: TickerMap }) {
  const hot = map.themes.find((t) => t.role === "leader" || t.role === "rotate-in");
  return (
    <section className="card p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Themes driving this name</h2>
        <span className="metric text-[10px] text-white/30">scored independently of the GICS sector</span>
      </div>
      <p className="mb-4 text-xs text-white/45">
        Cross-cutting narratives this ticker rides. A hot theme can lift a name even when its broad
        sector is soft.
      </p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {map.themes.map((t) => {
          const rm = ROLE_META[t.role] ?? ROLE_META.neutral;
          return (
            <Link key={t.id} href={`/themes/${t.id}`} className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 p-3 transition-colors hover:border-white/15 hover:bg-white/[0.04]">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-white/90">{t.name}</span>
                  <PhaseBadge phase={t.phase} />
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="chip border text-[10px]" style={{ background: `${rm.color}1a`, borderColor: `${rm.color}55`, color: rm.color }}>
                    {rm.label}
                  </span>
                  <span className="metric text-[10px] text-white/35">#{t.heatRank} of {t.totalThemes} themes</span>
                </div>
              </div>
              <div className="text-right">
                <span className="metric text-lg font-semibold" style={{ color: heatColor(t.heatScore) }}>{t.heatScore}</span>
                <div className="label">heat</div>
              </div>
            </Link>
          );
        })}
      </div>
      {hot && (
        <p className="mt-3 text-xs" style={{ color: ROLE_META[hot.role].color }}>
          Strongest tailwind: <span className="font-medium">{hot.name}</span> ({hot.roleLabel.toLowerCase()}, heat {hot.heatScore}).
        </p>
      )}
    </section>
  );
}

function CombinedCard({ map, roleColor }: { map: TickerMap; roleColor: string }) {
  return (
    <section className="card p-6" style={{ borderColor: `${roleColor}44` }}>
      <h2 className="mb-3 text-sm font-semibold text-white">The read</h2>
      <ul className="space-y-2.5">
        {map.combined.reasoning.map((r, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-white/75">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: roleColor }} />
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function UnknownCard({ map }: { map: TickerMap }) {
  return (
    <section className="card p-8 text-center">
      <h1 className="text-2xl font-bold text-white">{map.symbol}</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/60">{map.combined.headline}</p>
      <div className="mx-auto mt-4 max-w-md space-y-2 text-left">
        {map.combined.reasoning.map((r, i) => (
          <p key={i} className="text-xs leading-relaxed text-white/45">{r}</p>
        ))}
      </div>
      <p className="mt-5 text-[11px] text-white/30">{map.coverage} US equities currently mapped.</p>
    </section>
  );
}

function Caveats({ caveats, source }: { caveats: string[]; source: string }) {
  return (
    <section className="rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="label text-amber-200/70">Reasoning & limits</span>
        <span className="metric text-[10px] text-white/30">
          source: {source === "snapshot" ? "demo snapshot" : source === "stooq" ? "live prices" : "live · LunarCrush"}
        </span>
      </div>
      <ul className="space-y-1.5">
        {caveats.map((c, i) => (
          <li key={i} className="flex gap-2 text-[11px] leading-snug text-white/45">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-400/60" />
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// --- small bits --------------------------------------------------------------

function Stat({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-black/20 p-3 text-center">
      <div className="label">{label}</div>
      <div className="metric text-xl font-semibold" style={{ color }}>{value}</div>
      <div className="text-[10px] text-white/35">{sub}</div>
    </div>
  );
}

function MiniStat({ label, v }: { label: string; v: number | null }) {
  return (
    <div>
      <div className="label">{label}</div>
      {v === null ? <span className="metric text-white/30">—</span> : <Delta value={v} />}
    </div>
  );
}

function ConfidenceMeter({ value, label }: { value: number; label: string }) {
  const color = value >= 66 ? "#22c55e" : value >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${Math.max(4, value)}%`, background: color }} />
      </div>
      <span className="metric text-xs" style={{ color }}>{label} · {value}</span>
    </div>
  );
}

function scoreColor(v: number): string {
  if (v >= 66) return "#22c55e";
  if (v >= 45) return "#f59e0b";
  if (v >= 30) return "#fb923c";
  return "#ef4444";
}

// ConvictionBadge expects a full ConvictionRead; we only carry score+direction here.
function emptyConv() {
  return { score: 0, direction: "neutral" as const, agreement: 0, factors: [], summary: "" };
}
