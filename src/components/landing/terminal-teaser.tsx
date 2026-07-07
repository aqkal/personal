"use client";

import Link from "next/link";
import { motion as m } from "motion/react";
import { useEffect } from "react";

export function TerminalTeaser({
  onBack,
  onPlayGame,
}: {
  onBack: () => void;
  onPlayGame: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "1") onPlayGame();
      if (e.key === "2") window.location.href = "/about";
      if (e.key === "Escape") onBack();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack, onPlayGame]);

  const lines = [
    { text: "$ boot terminal_mode", cls: "text-cyan" },
    { text: "ERROR 501: interface not yet implemented", cls: "text-magenta" },
    { text: "> the terminal ships in v2 - it will read this same world.", cls: "text-ink/80" },
    { text: "> available exits:", cls: "text-ink/80" },
  ];

  return (
    <div className="crt-scanlines relative flex min-h-dvh items-center justify-center bg-[#04070d] px-5">
      <m.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-xl rounded-xl border border-line bg-black/60 p-6 shadow-[0_0_60px_-20px_rgba(83,216,255,0.4)]"
      >
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-magenta/70" />
          <span className="size-2.5 rounded-full bg-amber/70" />
          <span className="size-2.5 rounded-full bg-neon/70" />
        </div>
        <div className="mt-5 space-y-2.5 font-mono text-sm leading-relaxed">
          {lines.map((l, i) => (
            <m.p
              key={l.text}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 + i * 0.3 }}
              className={l.cls}
            >
              {l.text}
            </m.p>
          ))}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 + lines.length * 0.3 }}
            className="space-y-2 pl-4"
          >
            <button
              type="button"
              onClick={onPlayGame}
              className="block w-full rounded border border-neon/50 bg-neon/10 px-4 py-2 text-left text-neon transition-colors hover:bg-neon/20"
            >
              [1] enter the game world
            </button>
            <Link
              href="/about"
              className="block w-full rounded border border-cyan/50 bg-cyan/10 px-4 py-2 text-cyan transition-colors hover:bg-cyan/20"
            >
              [2] browse the classic site
            </Link>
          </m.div>
          <m.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 + lines.length * 0.3 }}
            className="pt-2 text-cyan"
          >
            $ <span className="animate-blink">█</span>
          </m.p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="mt-6 text-xs text-muted transition-colors hover:text-ink"
        >
          ← back to interface select (Esc)
        </button>
      </m.div>
    </div>
  );
}
