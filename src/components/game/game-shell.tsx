"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type Phaser from "phaser";
import { profile } from "@content";

/**
 * Mounts the Phaser world and layers the React HUD on top.
 * This component is itself dynamically imported (ssr: false), so Phaser and
 * all game systems stay out of every other page's bundle.
 */
export function GameShell({ onExit }: { onExit: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [ready, setReady] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [fps, setFps] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [{ createGame }, { gameBus }] = await Promise.all([
        import("@/game"),
        import("@/game/bus"),
      ]);
      if (cancelled || !hostRef.current || gameRef.current) return;

      const onReady = () => setReady(true);
      gameBus.on("world:ready", onReady);
      gameRef.current = createGame(hostRef.current);

      // dev-only fps meter (never runs in production builds)
      let fpsTimer: ReturnType<typeof setInterval> | undefined;
      if (process.env.NODE_ENV === "development") {
        fpsTimer = setInterval(() => {
          setFps(Math.round(gameRef.current?.loop.actualFps ?? 0));
        }, 800);
      }

      const cleanup = () => {
        gameBus.off("world:ready", onReady);
        if (fpsTimer) clearInterval(fpsTimer);
      };
      // stash cleanup on the ref holder
      (gameRef as { cleanup?: () => void }).cleanup = cleanup;
    })();

    return () => {
      cancelled = true;
      (gameRef as { cleanup?: () => void }).cleanup?.();
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  // auto-hide the controls hint after a few seconds of play
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setShowHint(false), 7000);
    return () => clearTimeout(t);
  }, [ready]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg">
      {/* Phaser canvas host */}
      <div ref={hostRef} className="absolute inset-0" />

      {/* boot veil until the world reports ready */}
      <div
        aria-hidden={ready}
        className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-bg transition-opacity duration-700 ${
          ready ? "opacity-0" : "opacity-100"
        }`}
      >
        <p className="font-pixel text-xs text-neon">
          BUILDING WORLD<span className="animate-blink">_</span>
        </p>
      </div>

      {/* top HUD bar */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between p-3">
        <p className="rounded bg-black/50 px-3 py-1.5 font-pixel text-[9px] text-neon backdrop-blur-sm">
          ★ {profile.name.toUpperCase()}&apos;S WORLD
        </p>
        <div className="flex items-center gap-2">
          {fps !== null && (
            <span
              className={`rounded bg-black/50 px-2 py-1 font-mono text-[10px] ${
                fps >= 55 ? "text-neon" : fps >= 45 ? "text-amber" : "text-magenta"
              }`}
            >
              {fps} fps
            </span>
          )}
          <Link
            href="/about"
            className="rounded border border-line bg-black/50 px-3 py-1.5 text-xs text-muted backdrop-blur-sm transition-colors hover:text-ink"
          >
            Classic site
          </Link>
          <button
            type="button"
            onClick={onExit}
            className="rounded border border-line bg-black/50 px-3 py-1.5 text-xs text-muted backdrop-blur-sm transition-colors hover:text-ink"
            title="Back to interface select"
          >
            ✕
          </button>
        </div>
      </div>

      {/* controls hint */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-6 z-30 flex justify-center transition-opacity duration-1000 ${
          showHint && ready ? "opacity-100" : "opacity-0"
        }`}
      >
        <p className="rounded-lg bg-black/60 px-4 py-2 font-pixel text-[9px] leading-relaxed text-ink/90 backdrop-blur-sm">
          WASD / ARROWS · MOVE&nbsp;&nbsp;·&nbsp;&nbsp;E / SPACE · INTERACT
        </p>
      </div>
    </div>
  );
}
