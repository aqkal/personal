"use client";

import { useEffect, useRef, useState } from "react";
import { campusUi, profile } from "@content";
import { gameBus } from "@/game/bus";
import {
  STAGE_LABEL,
  STAGE_ORDER,
  STAGE_WEIGHT,
  type WorldStage,
} from "@/game/progress";

const SAFETY_MS = 15000;
const TEAR_MS = 750;

/**
 * Boarding pass driven by real boot progress (chunk download, GL context,
 * shader precompile, first frame). Tears away into the camera fly-in.
 */
export function BootBoardingPass({
  reducedMotion,
  onDone,
  onExit,
}: {
  reducedMotion: boolean;
  onDone: () => void;
  onExit: () => void;
}) {
  const [stage, setStage] = useState<WorldStage>("shell");
  const [leaving, setLeaving] = useState(false);
  const [slow, setSlow] = useState(false);
  const stageRef = useRef<WorldStage>("shell");

  useEffect(() => {
    const advance = ({ stage: next }: { stage: WorldStage }) => {
      if (STAGE_ORDER.indexOf(next) <= STAGE_ORDER.indexOf(stageRef.current))
        return;
      stageRef.current = next;
      setStage(next);
    };
    gameBus.on("world:progress", advance);
    const safety = setTimeout(() => setSlow(true), SAFETY_MS);
    return () => {
      gameBus.off("world:progress", advance);
      clearTimeout(safety);
    };
  }, []);

  useEffect(() => {
    if (stage !== "frame") return;
    const tear = setTimeout(() => setLeaving(true), 350);
    const done = setTimeout(
      () => onDone(),
      350 + (reducedMotion ? 400 : TEAR_MS),
    );
    return () => {
      clearTimeout(tear);
      clearTimeout(done);
    };
  }, [stage, reducedMotion, onDone]);

  const pct = STAGE_WEIGHT[stage];
  const passenger = profile.name.toUpperCase();

  return (
    <div
      role="status"
      aria-label={`Loading 3D campus, ${pct}%`}
      className={`grain absolute inset-0 z-20 flex items-center justify-center bg-bg px-5 transition-opacity ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      } ${reducedMotion ? "duration-300" : "duration-700"}`}
    >
      <div
        className={`w-full max-w-sm border border-line bg-surface shadow-[0_24px_70px_-30px_rgba(0,0,0,0.7)] ${
          reducedMotion
            ? ""
            : "transition-transform duration-700 ease-in " +
              (leaving ? "-translate-y-[140%] -rotate-6" : "")
        }`}
      >
        {slow && stage !== "frame" && <div className="border-b border-line p-4 text-sm text-muted">The campus is taking a little longer to load.<button onClick={onExit} className="mt-2 block text-accent">Explore the portfolio instead →</button></div>}
        {/* header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <p className="font-pixel text-[9px] text-accent">CAMPUS AIR</p>
          <p className="microlabel font-mono text-muted">GATE 3D · SEAT 1A</p>
        </div>

        {/* route */}
        <div className="flex items-end justify-between px-5 pt-5">
          <div>
            <p className="font-display text-4xl font-bold tracking-tight">
              BNE
            </p>
            <p className="microlabel mt-1 font-mono text-muted">BRISBANE</p>
          </div>
          <div className="relative mb-6 h-px flex-1 self-center bg-line mx-4">
            <span
              aria-hidden
              className="absolute -top-2.5 text-sm text-accent transition-[left] duration-500 ease-out"
              style={{ left: `calc(${pct}% - 10px)` }}
            >
              ✈
            </span>
          </div>
          <div className="text-right">
            <p className="font-display text-4xl font-bold tracking-tight">
              UQ
            </p>
            <p className="microlabel mt-1 font-mono text-muted">CAMPUS</p>
          </div>
        </div>

        {/* passenger */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-5">
          <div>
            <p className="microlabel font-mono text-muted">PASSENGER</p>
            <p className="mt-0.5 truncate text-sm font-semibold">{passenger}</p>
          </div>
          <div>
            <p className="microlabel font-mono text-muted">CLASS</p>
            <p className="mt-0.5 text-sm font-semibold">STUDENT</p>
          </div>
        </div>

        <div className="border-y border-line px-5 py-3">
          <p className="microlabel font-mono text-muted">{campusUi.rideControlsTitle}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{campusUi.rideControls}</p>
        </div>

        {/* stub: progress + barcode */}
        <div className="perf-line" aria-hidden />
        <div className="px-5 py-4">
          <div className="flex items-baseline justify-between">
            <p className="font-pixel text-[9px] text-accent">
              {STAGE_LABEL[stage]}
              <span className="animate-blink">_</span>
            </p>
            <p className="font-mono text-[10px] text-muted">{pct}%</p>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded bg-line">
            <div
              className="h-full rounded bg-accent transition-[width] duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div
            aria-hidden
            className="mt-4 h-8 opacity-60"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, var(--ink) 0 2px, transparent 2px 5px, var(--ink) 5px 8px, transparent 8px 12px)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
