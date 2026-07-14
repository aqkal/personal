"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { profile } from "@content";
import { gameBus } from "@/game/bus";
import { runtime } from "@/game3d/state";
import { useMediaQuery } from "@/lib/use-media-query";
import { DialogPanel } from "./dialog-panel";
import { TouchControls } from "./touch-controls";
import { MapOverlay, Minimap } from "./world-map";

/**
 * Three.js and the whole 3D world stay behind this dynamic import; no other
 * page pays for them.
 */
const World3D = dynamic(() => import("@/game3d/world"), {
  ssr: false,
  loading: () => null,
});

export function GameShell({ onExit }: { onExit: () => void }) {
  const [ready, setReady] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [interactHint, setInteractHint] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [fps, setFps] = useState<number | null>(null);

  useEffect(() => {
    const onReady = () => setReady(true);
    const onHintShow = ({ label }: { label: string }) => setInteractHint(label);
    const onHintHide = () => setInteractHint(null);
    const onPanelOpen = () => setDialogOpen(true);
    const onPanelClose = () => setDialogOpen(false);
    gameBus.on("world:ready", onReady);
    gameBus.on("hint:show", onHintShow);
    gameBus.on("hint:hide", onHintHide);
    gameBus.on("panel:open", onPanelOpen);
    gameBus.on("panel:close", onPanelClose);
    return () => {
      gameBus.off("world:ready", onReady);
      gameBus.off("hint:show", onHintShow);
      gameBus.off("hint:hide", onHintHide);
      gameBus.off("panel:open", onPanelOpen);
      gameBus.off("panel:close", onPanelClose);
    };
  }, []);

  // M toggles the map (never over a dialog); the map pauses the world
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "m" || e.key === "M") && !dialogOpen) {
        e.preventDefault();
        setMapOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialogOpen]);

  useEffect(() => {
    if (mapOpen) {
      runtime.paused = true;
      return () => {
        runtime.paused = false;
      };
    }
  }, [mapOpen]);

  // dev-only fps meter
  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !ready) return;
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const loop = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 1000) {
        setFps(frames);
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  // auto-hide the controls hint after a few seconds of play
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setShowHint(false), 8000);
    return () => clearTimeout(t);
  }, [ready]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg">
      <World3D reducedMotion={reducedMotion} />

      {/* subtle framing vignette (plain CSS, zero GPU cost) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_62%,rgba(8,16,30,0.26))]"
      />

      {/* boot veil until the world reports ready */}
      <div
        aria-hidden={ready}
        className={`pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-bg transition-opacity duration-1000 ${
          ready ? "opacity-0" : "opacity-100"
        }`}
      >
        <p className="font-pixel text-xs text-neon">
          FLYING INTO BRISBANE<span className="animate-blink">_</span>
        </p>
        <div className="h-1 w-44 overflow-hidden rounded bg-line">
          <div className="h-full w-1/2 animate-[drift_1.6s_linear_infinite] rounded bg-neon" />
        </div>
      </div>

      {/* top HUD bar */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between p-3">
        <p className="rounded bg-black/50 px-3 py-1.5 font-pixel text-[9px] text-neon backdrop-blur-sm">
          ★ {profile.name.toUpperCase()}&apos;S CAMPUS
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

      {/* interaction hint (proximity) or controls hint */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-6 z-30 flex justify-center transition-opacity duration-300 ${
          ready && (interactHint || showHint) ? "opacity-100" : "opacity-0"
        }`}
      >
        <p
          className={`rounded-lg px-4 py-2 text-center font-pixel text-[9px] leading-relaxed backdrop-blur-sm ${
            interactHint
              ? "border border-neon/40 bg-black/70 text-neon"
              : "bg-black/60 text-ink/90"
          }`}
        >
          {interactHint ??
            "WASD · MOVE  ·  DRAG · LOOK  ·  SHIFT · RUN  ·  E · INTERACT  ·  M · MAP"}
        </p>
      </div>

      {ready && <Minimap onExpand={() => setMapOpen(true)} />}
      {mapOpen && <MapOverlay onClose={() => setMapOpen(false)} />}

      <TouchControls />

      {/* RPG dialog overlay */}
      <DialogPanel />
    </div>
  );
}
