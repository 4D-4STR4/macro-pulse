import type { Metadata } from "next";
import "./globals.css";
import { WatchlistProvider } from "@/app/components/watchlist/WatchlistProvider";
import { NavBar } from "@/app/components/NavBar";

export const metadata: Metadata = {
  title: "MacroPulse — Sector Wave & Rotation Intelligence",
  description:
    "Detect the hottest market sector, predict where capital rotates next, and know when to hop off the wave.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <WatchlistProvider>
          <NavBar />
          {children}
        </WatchlistProvider>
      </body>
    </html>
  );
}
