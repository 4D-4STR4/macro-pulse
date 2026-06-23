import Link from "next/link";

export default function ThemeNotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
      <h1 className="text-2xl font-bold text-white">Theme not found</h1>
      <p className="mt-2 text-sm text-white/50">That theme isn&apos;t in our current set.</p>
      <Link href="/themes" className="mt-5 inline-block text-sm text-sky-400 hover:text-sky-300">
        ← All themes
      </Link>
    </main>
  );
}
