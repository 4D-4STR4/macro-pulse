"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Ticker search box. Submits to /ticker/{symbol}. Strips a leading $ and
 * uppercases so "$nvda" and "nvda" both work.
 */
export function TickerSearch({ autoFocus = false, size = "md" }: { autoFocus?: boolean; size?: "md" | "lg" }) {
  const router = useRouter();
  const [value, setValue] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = value.trim().replace(/^\$/, "").toUpperCase();
    if (sym) router.push(`/ticker/${encodeURIComponent(sym)}`);
  };

  const lg = size === "lg";
  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30">$</span>
        <input
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Map any ticker — e.g. NVDA"
          aria-label="Ticker symbol"
          spellCheck={false}
          autoCapitalize="characters"
          className={`metric rounded-lg border border-white/15 bg-ink-900/80 pl-6 pr-3 text-white placeholder:text-white/30 outline-none transition-colors focus:border-sky-400/60 ${
            lg ? "h-11 w-72 text-base" : "h-9 w-56 text-sm"
          }`}
        />
      </div>
      <button
        type="submit"
        className={`rounded-lg border border-sky-400/40 bg-sky-400/10 px-3 font-medium text-sky-300 transition-colors hover:bg-sky-400/20 ${
          lg ? "h-11 text-base" : "h-9 text-sm"
        }`}
      >
        Map it
      </button>
    </form>
  );
}
