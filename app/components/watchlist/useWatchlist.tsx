"use client";

// Watchlist state — the trader's personal layer over the market read.
// A tiny React context that persists which sector ids are held/watched in
// localStorage, so it survives reloads but never leaks into the SSR pass.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "macropulse.watchlist";

export interface WatchlistApi {
  /** Watched sector ids, in insertion order. */
  ids: string[];
  /** Is this id currently watched? */
  has: (id: string) => boolean;
  /** Add/remove an id from the watchlist. */
  toggle: (id: string) => void;
  /** Drop every watched id. */
  clear: () => void;
  /** False during SSR + first paint; true once hydrated from localStorage.
   *  Gate any watched/empty rendering on this to avoid hydration mismatch. */
  ready: boolean;
}

const WatchlistContext = createContext<WatchlistApi | null>(null);

function readStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // keep only strings, dedupe, preserve order
    return Array.from(new Set(parsed.filter((x): x is string => typeof x === "string")));
  } catch {
    return [];
  }
}

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  // Start empty so server and first client render agree; hydrate after mount.
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIds(readStorage());
    setReady(true);
  }, []);

  // Persist whenever the set changes — but only after we've hydrated, so we
  // never overwrite stored state with the initial empty array.
  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // storage full / disabled — silently degrade to in-memory only
    }
  }, [ids, ready]);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback((id: string) => {
    setIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const clear = useCallback(() => setIds([]), []);

  const value = useMemo<WatchlistApi>(
    () => ({ ids, has, toggle, clear, ready }),
    [ids, has, toggle, clear, ready],
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

/** Access the watchlist. Must be used inside <WatchlistProvider>. */
export function useWatchlist(): WatchlistApi {
  const ctx = useContext(WatchlistContext);
  if (!ctx) {
    throw new Error("useWatchlist must be used within a <WatchlistProvider>");
  }
  return ctx;
}
