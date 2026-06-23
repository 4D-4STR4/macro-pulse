import { getMarketData } from "@/lib/data/provider";
import { backtest, type PhaseStat, type BucketStat } from "@/lib/engine/backtest";
import { PHASE_META } from "@/lib/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Signal Track Record · MacroPulse" };

const fwd = (x: number) => (
  <span className={`metric ${x >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
    {x >= 0 ? "+" : ""}
    {x.toFixed(2)}%
  </span>
);

export default async function SignalsPage() {
  const market = await getMarketData();
  const bt = backtest(market, 10);

  const best = [...bt.phases].sort((a, b) => b.avgFwd - a.avgFwd)[0];
  const worst = [...bt.phases].sort((a, b) => a.avgFwd - b.avgFwd)[0];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Signal Track Record</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-white/50">
          A walk-forward backtest of the engine&apos;s own calls: at every past day we re-run the
          engine and measure the realized return over the next {bt.horizonDays} trading days. Does
          the signal precede the move?
        </p>
      </header>

      {/* Headline edge cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Phase spread" value={`${bt.phaseSpread.toFixed(1)} pp`}
          sub={best && worst ? `${PHASE_META[best.phase].label} best · ${PHASE_META[worst.phase].label} worst` : ""}
          tint="#22c55e" />
        <Stat label="Exit-signal edge" value={`${bt.exitEdge >= 0 ? "+" : ""}${bt.exitEdge.toFixed(2)} pp`}
          sub="low-exit minus high-exit fwd return" tint={bt.exitEdge >= 0 ? "#22c55e" : "#ef4444"} />
        <Stat label="Samples" value={bt.samples.toLocaleString()}
          sub={`over ${bt.windowDays} days of history`} tint="#38bdf8" />
      </div>

      {/* Phase -> forward return */}
      <Section title="Lifecycle phase → forward return"
        note="If the classifier has edge, momentum/emerging should lead positive returns and distribution/decline negative ones.">
        <Table head={["Phase", "Samples", `Avg fwd (${bt.horizonDays}d)`, "Hit rate"]}>
          {bt.phases.map((p: PhaseStat) => (
            <tr key={p.phase} className="border-b border-white/5">
              <td className="py-2.5">
                <span className="chip border" style={{ background: `${PHASE_META[p.phase].color}1a`, borderColor: `${PHASE_META[p.phase].color}55`, color: PHASE_META[p.phase].color }}>
                  {PHASE_META[p.phase].label}
                </span>
              </td>
              <td className="py-2.5 metric text-white/60">{p.n}</td>
              <td className="py-2.5">{fwd(p.avgFwd)}</td>
              <td className="py-2.5 metric text-white/70">{p.hitRate}%</td>
            </tr>
          ))}
        </Table>
      </Section>

      {/* Exit signal effectiveness */}
      <Section title="Hop-off signal → forward return"
        note="A working exit signal means higher exit scores precede weaker forward returns.">
        <Table head={["Exit bucket", "Samples", `Avg fwd (${bt.horizonDays}d)`, "Hit rate"]}>
          {bt.exitBuckets.map((b: BucketStat) => (
            <Row key={b.key} label={b.label} n={b.n} avg={b.avgFwd} hit={b.hitRate} />
          ))}
        </Table>
      </Section>

      {/* Heat persistence */}
      <Section title="Heat leadership → forward return"
        note="Do the hottest sectors keep leading over the next two weeks, or mean-revert?">
        <Table head={["Heat group", "Samples", `Avg fwd (${bt.horizonDays}d)`, "Hit rate"]}>
          {bt.heatBuckets.map((b: BucketStat) => (
            <Row key={b.key} label={b.label} n={b.n} avg={b.avgFwd} hit={b.hitRate} />
          ))}
        </Table>
      </Section>

      <p className="mt-6 text-[11px] leading-relaxed text-white/35">
        {bt.source === "snapshot"
          ? "Source: bundled demo snapshot — these numbers are illustrative (synthetic price paths). The methodology is real; the same backtest runs against live history when a live data source is enabled."
          : "Source: live history. Walk-forward, no look-ahead: each day's signal is computed only from data available up to that day."}
        {" "}Research only — not investment advice. Past behavior doesn&apos;t guarantee future results.
      </p>
    </main>
  );
}

function Stat({ label, value, sub, tint }: { label: string; value: string; sub: string; tint: string }) {
  return (
    <div className="card-interactive relative overflow-hidden p-4">
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-20 blur-2xl" style={{ background: tint }} />
      <div className="label">{label}</div>
      <div className="mt-1 metric text-2xl font-bold text-white">{value}</div>
      <div className="mt-0.5 text-[11px] text-white/45">{sub}</div>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="card mb-5 p-6">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-1 mb-4 text-xs text-white/45">{note}</p>
      {children}
    </section>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full min-w-[460px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left">
            {head.map((h, i) => (
              <th key={h} className={`pb-2 font-normal text-white/40 ${i === 0 ? "" : "text-left"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Row({ label, n, avg, hit }: { label: string; n: number; avg: number; hit: number }) {
  return (
    <tr className="border-b border-white/5">
      <td className="py-2.5 text-white/85">{label}</td>
      <td className="py-2.5 metric text-white/60">{n}</td>
      <td className="py-2.5">{fwd(avg)}</td>
      <td className="py-2.5 metric text-white/70">{hit}%</td>
    </tr>
  );
}
