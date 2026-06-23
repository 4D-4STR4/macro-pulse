"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TickerSearch } from "./TickerSearch";

const LINKS = [
  { href: "/", label: "Dashboard", match: (p: string) => p === "/" },
  { href: "/themes", label: "Themes", match: (p: string) => p.startsWith("/themes") },
  { href: "/sectors", label: "Sectors", match: (p: string) => p.startsWith("/sectors") },
];

/** Global top navigation — brand, section links, and the ticker search. */
export function NavBar() {
  const pathname = usePathname() || "/";
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Logo />
          <span className="text-sm font-bold tracking-tight text-white">MacroPulse</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {LINKS.map((l) => {
            const active = l.match(pathname);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  active ? "bg-white/10 text-white" : "text-white/55 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto">
          <TickerSearch />
        </div>
      </div>

      {/* Mobile section links */}
      <nav className="flex items-center gap-1 border-t border-white/5 px-4 pb-2 pt-1 sm:hidden">
        {LINKS.map((l) => {
          const active = l.match(pathname);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                active ? "bg-white/10 text-white" : "text-white/55"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 26 26" fill="none" aria-hidden>
      <rect width="26" height="26" rx="7" fill="#0f1730" stroke="rgba(255,255,255,0.1)" />
      <path
        d="M4 15.5l4-6 3 4 3.5-7 3.5 9 4-3"
        stroke="#22c55e"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
