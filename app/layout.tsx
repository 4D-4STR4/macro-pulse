import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MacroPulse — Sector Wave & Rotation Intelligence",
  description:
    "Detect the hottest market sector, predict where capital rotates next, and know when to hop off the wave.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
