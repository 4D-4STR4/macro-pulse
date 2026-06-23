import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-4 py-20 sm:px-6">
      <h1 className="text-2xl font-bold text-white">Sector not found</h1>
      <p className="text-sm text-white/50">
        That sector isn&apos;t in the current market read.
      </p>
      <Link
        href="/"
        className="chip border border-white/10 bg-white/5 text-white/70 transition-colors hover:text-white"
      >
        ← Back to dashboard
      </Link>
    </main>
  );
}
