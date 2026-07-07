"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { ModeChooser } from "./mode-chooser";
import { TerminalTeaser } from "./terminal-teaser";

/**
 * Phaser and every game system live behind this dynamic import — the landing
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

type Mode = "boot" | "choose" | "game" | "terminal";

const STORAGE_KEY = "interface";

export function HomeShell() {
  const [mode, setMode] = useState<Mode>("boot");

  // Returning visitors who picked the game go straight back into it.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // storage blocked — fall through to the chooser
    }
    setMode(stored === "game" ? "game" : "choose");
  }, []);

  const choose = useCallback((next: "game" | "terminal") => {
    if (next === "game") {
      try {
        localStorage.setItem(STORAGE_KEY, "game");
      } catch {
        // non-fatal
      }
    }
    setMode(next);
  }, []);

  const backToChooser = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // non-fatal
    }
    setMode("choose");
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
        onBack={() => setMode("choose")}
        onPlayGame={() => choose("game")}
      />
    );
  }
  return <ModeChooser onChoose={choose} />;
}
