"use client";

import { useEffect, useRef, useState } from "react";
import { gameBus } from "@/game/bus";
import { destinationBearing, unwrapBearing } from "@/game/navigation-bearing";
import { groundHeight } from "@/game3d/layout";
import { DESTINATIONS, destinationId, navigation } from "@/game3d/navigation";
import { cameraOrbit, playerPos } from "@/game3d/state";
import { useMediaQuery } from "@/lib/use-media-query";

const VISITS_KEY = "campus-passport-v1";
export function readVisits(): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(VISITS_KEY) ?? "[]");
    return Array.isArray(saved) ? [...new Set(saved.filter((id): id is string => typeof id === "string" && DESTINATIONS.some((d) => destinationId(d) === id)))] : [];
  } catch { return []; }
}

export function useCampusVisits() {
  const [visited, setVisited] = useState<string[]>(readVisits);
  useEffect(() => {
    const visit = ({ id }: { id: string }) => {
      setVisited((old) => {
        if (old.includes(id)) return old;
        return [...old, id];
      });
    };
    gameBus.on("campus:visit", visit);
    return () => gameBus.off("campus:visit", visit);
  }, []);
  useEffect(() => {
    try { localStorage.setItem(VISITS_KEY, JSON.stringify(visited)); } catch { /* Optional local progress. */ }
  }, [visited]);
  return visited;
}

export function CampusGuide({ visited, onMap }: { visited: string[]; onMap: () => void }) {
  const isTouch = useMediaQuery("(pointer: coarse)");
  const [route, setRoute] = useState<{ id: string | null; arrived: boolean; failed?: boolean }> (() => ({ id: navigation.destination ? destinationId(navigation.destination) : null, arrived: navigation.arrived, failed: !!navigation.destination && !navigation.points.length }));
  const arrow = useRef<HTMLSpanElement>(null);
  const distance = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    gameBus.on("navigation:change", setRoute);
    return () => gameBus.off("navigation:change", setRoute);
  }, []);
  useEffect(() => {
    let frame = 0;
    let lastDistanceUpdate = 0;
    let displayedAngle: number | null = null;
    let lastTarget: string | null = null;
    const update = (time: number) => {
      frame = requestAnimationFrame(update);
      const target = navigation.destination;
      if (!target) { lastTarget = null; displayedAngle = null; return; }
      const id = destinationId(target);
      if (id !== lastTarget) { lastTarget = id; displayedAngle = null; lastDistanceUpdate = -Infinity; }
      if (time - lastDistanceUpdate >= 80) {
        lastDistanceUpdate = time;
        if (distance.current) distance.current.textContent = `${Math.round(Math.hypot(target.x - playerPos.x, target.z - playerPos.z))} m`;
      }
      if (!arrow.current) return;
      if (navigation.arrived) { arrow.current.style.transform = "rotate(0rad)"; displayedAngle = null; return; }
      // The arrow and distance refer to the selected location. The ground trail
      // supplies the walkable route around obstacles, independently of bearing.
      const bearing = destinationBearing(
        { ...playerPos, y: groundHeight(playerPos.x, playerPos.z) },
        { ...target, y: groundHeight(target.x, target.z) },
        cameraOrbit.yaw,
        cameraOrbit.pitch,
      );
      if (bearing === null) return;
      displayedAngle = displayedAngle === null ? bearing : unwrapBearing(displayedAngle, bearing);
      arrow.current.style.transform = `rotate(${displayedAngle}rad)`;
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, []);
  const target = DESTINATIONS.find((d) => destinationId(d) === route.id);
  const complete = visited.length === DESTINATIONS.length;
  return (
    <div className="campus-guide game-glass">
      <button onClick={onMap} className="flex w-full items-center justify-between gap-4 text-left">
        <span>
          <span className="block font-mono text-xs uppercase tracking-[0.16em] text-accent">Discovery journal</span>
          <span className="mt-1 block text-sm text-ink">{complete ? "Every stop discovered" : `${visited.length} of ${DESTINATIONS.length} stops discovered`}</span>
        </span>
        <span aria-hidden className="text-xl text-accent">↗</span>
      </button>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-label="Campus discoveries" aria-valuenow={visited.length} aria-valuemin={0} aria-valuemax={DESTINATIONS.length}>
        <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${visited.length / DESTINATIONS.length * 100}%` }} />
      </div>
      {target ? (
        <div className="mt-4 flex items-center gap-3 border-t border-line pt-3">
          <span ref={arrow} aria-hidden className="inline-flex size-8 shrink-0 items-center justify-center text-2xl text-accent">{route.arrived ? "✓" : "↑"}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{target.payload?.title ?? "River lookout"}</p>
            <p className="mt-1 text-xs text-muted" aria-live="polite">{route.failed ? "Route unavailable. Choose another stop." : route.arrived ? (target.payload ? `You arrived. ${isTouch ? "Tap Discover" : "Press E"} to open it.` : "Take in the view.") : <>Follow the gold trail · <span ref={distance} /></>}</p>
          </div>
          <button className="game-icon-button" aria-label="Clear destination" onClick={() => gameBus.emit("navigation:select", { id: "" })}>×</button>
        </div>
      ) : (
        <button onClick={onMap} className="mt-3 flex w-full items-center justify-between text-sm text-accent">Choose a destination <span aria-hidden>→</span></button>
      )}
    </div>
  );
}
