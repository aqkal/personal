"use client";

import dynamic from "next/dynamic";
import { useCallback, useState, useSyncExternalStore } from "react";
import { ModeChooser } from "./mode-chooser";
import { TerminalTeaser } from "./terminal-teaser";

/**
 * Three.js and every game system live behind this dynamic import; the landing
 * page and classic site ship ZERO game code (see Performance Budget in
 * docs/ARCHITECTURE.md).
 */
const GameShell = dynamic(
  () => import("@/components/game/game-shell").then((mod) => mod.GameShell),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <p className="font-pixel text-xs text-neon">
          LOADING WORLD<span className="animate-blink">_</span>
        </p>
      </div>
    ),
  },
);

type Mode = "choose" | "game" | "terminal";

const STORAGE_KEY = "interface";
const SERVER_SENTINEL = "__server__";

function subscribeNever() {
  return () => {};
}

function readStoredInterface(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function HomeShell() {
  // SSR renders a blank boot frame; the client snapshot kicks in on hydration
  // (returning visitors who picked the game go straight back into it).
  const stored = useSyncExternalStore(
    subscribeNever,
    readStoredInterface,
    () => SERVER_SENTINEL,
  );
  const [override, setOverride] = useState<Mode | null>(null);

  const mode: Mode | "boot" =
    override ??
    (stored === SERVER_SENTINEL
      ? "boot"
      : stored === "game"
        ? "game"
        : "choose");

  const choose = useCallback((next: "game" | "terminal") => {
    if (next === "game") {
      try {
        localStorage.setItem(STORAGE_KEY, "game");
      } catch {
        // non-fatal
      }
    }
    setOverride(next);
  }, []);

  const backToChooser = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // non-fatal
    }
    setOverride("choose");
  }, []);

  if (mode === "boot") {
    return <div className="min-h-dvh bg-bg" />;
  }
  if (mode === "game") {
    return <GameShell onExit={backToChooser} />;
  }
  if (mode === "terminal") {
    return (
      <TerminalTeaser
        onBack={() => setOverride("choose")}
        onPlayGame={() => choose("game")}
      />
    );
  }
  return <ModeChooser onChoose={choose} />;
}
