"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { LatestPostMeta } from "@/components/portfolio/portfolio-shell";
import { INTERFACE_KEY, setStoredInterface } from "@/lib/interface-mode";
import { ModeChooser } from "./mode-chooser";

/**
 * Both interfaces stay behind dynamic imports; the landing page and classic
 * site ship zero game or portfolio-shell code (see Performance Budget in
 * docs/ARCHITECTURE.md).
 */
const GameShell = dynamic(
  () => import("@/components/game/game-shell").then((mod) => mod.GameShell),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <p role="status" className="font-pixel text-xs text-accent">
          LOADING WORLD<span className="animate-blink">_</span>
        </p>
      </div>
    ),
  },
);

const PortfolioShell = dynamic(
  () =>
    import("@/components/portfolio/portfolio-shell").then(
      (mod) => mod.PortfolioShell,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <p role="status" className="font-mono text-sm text-accent">
          opening portfolio<span className="animate-blink">_</span>
        </p>
      </div>
    ),
  },
);

type Mode = "choose" | "game" | "portfolio";

const SERVER_SENTINEL = "__server__";

function subscribeNever() {
  return () => {};
}

function readStoredInterface(): string | null {
  const requested = new URLSearchParams(window.location.search).get("view");
  if (requested === "game" || requested === "portfolio") return requested;
  try {
    return localStorage.getItem(INTERFACE_KEY);
  } catch {
    return null;
  }
}

export function HomeShell({
  latestPost,
}: {
  latestPost: LatestPostMeta | null;
}) {
  // Render the front door on the server so identity and deep-page links are
  // available before hydration, including when JavaScript is unavailable.
  const stored = useSyncExternalStore(
    subscribeNever,
    readStoredInterface,
    () => SERVER_SENTINEL,
  );
  const [override, setOverride] = useState<Mode | null>(null);
  useEffect(() => {
    if (stored === "game" || stored === "portfolio") setStoredInterface(stored);
  }, [stored]);

  const mode: Mode | "boot" =
    override ??
    (stored === SERVER_SENTINEL
      ? "boot"
      : stored === "game"
        ? "game"
        : stored === "portfolio"
          ? "portfolio"
          : "choose");

  const choose = useCallback((next: "game" | "portfolio") => {
    clearViewQuery();
    setStoredInterface(next);
    setOverride(next);
  }, []);

  const backToChooser = useCallback(() => {
    clearViewQuery();
    try {
      localStorage.removeItem(INTERFACE_KEY);
    } catch {
      // non-fatal
    }
    setOverride("choose");
  }, []);

  if (mode === "game") {
    return <GameShell onExit={backToChooser} onPortfolio={() => choose("portfolio")} />;
  }
  if (mode === "portfolio") {
    return (
      <PortfolioShell
        onExit={backToChooser}
        onPlayGame={() => choose("game")}
        latestPost={latestPost}
      />
    );
  }
  return <ModeChooser onChoose={choose} />;
}

function clearViewQuery() {
  const url = new URL(window.location.href);
  url.searchParams.delete("view");
  url.hash = "";
  window.history.replaceState(window.history.state, "", url);
}
