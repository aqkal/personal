import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center crt-scanlines">
      <p className="font-pixel text-6xl text-magenta [text-shadow:0_0_24px_var(--color-magenta)]">
        404
      </p>
      <h1 className="mt-6 font-pixel text-sm text-ink">LEVEL NOT FOUND</h1>
      <p className="mt-4 max-w-md text-sm text-muted">
        You wandered off the map. The cartographers have been notified (they
        have not).
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
        <Link
          href="/"
          className="btn-fx rounded border border-neon/50 bg-neon/10 px-5 py-2 font-medium text-neon hover:bg-neon/20"
        >
          ▶ Respawn at start
        </Link>
        <Link
          href="/about"
          className="btn-fx rounded border border-line px-5 py-2 text-muted hover:border-cyan/50 hover:text-cyan"
        >
          Classic site
        </Link>
      </div>
    </main>
  );
}
