"use client";
import { useEffect, useRef, useState } from "react";
import { DESTINATIONS, destinationId } from "@/game3d/navigation";
import { gameBus } from "@/game/bus";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import { MAP_ASPECT, useMapCanvas } from "./world-map";

const GROUPS = [
  { id: "all", label: "All stops" },
  { id: "experience", label: "Career" },
  { id: "project", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "landmark", label: "Campus" },
];
const KIND_LABEL: Record<string, string> = { education: "Education", experience: "Experience", project: "Project", skills: "Skills", blog: "Writing", contact: "Say hello", snake: "Bonus game", landmark: "St Lucia landmark" };
const mapSize = () => Math.max(180, Math.min(410, window.innerWidth - 72, (window.innerHeight - 180) / MAP_ASPECT));

export function MapOverlay({ onClose, visited }: { onClose: () => void; visited: string[] }) {
  const [filter, setFilter] = useState("all");
  const [size, setSize] = useState(mapSize);
  const ref = useMapCanvas(size);
  const panel = useRef<HTMLDivElement>(null);
  useDialogFocus(panel, true);
  useEffect(() => {
    const resize = () => setSize(mapSize());
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } };
    window.addEventListener("keydown", key);
    window.addEventListener("resize", resize);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("resize", resize); };
  }, [onClose]);
  return (
    <div className="game-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="map-title" tabIndex={-1} className="campus-map-panel">
        <div className="flex items-start justify-between gap-4 border-b border-line p-5 sm:p-6">
          <div><p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Explore at your own pace</p><h2 id="map-title" className="mt-2 font-display text-3xl">Your campus, mapped.</h2></div>
          <button onClick={onClose} aria-label="Close campus map" className="game-icon-button">×</button>
        </div>
        <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[auto_300px]">
          <div className="mx-auto">
            <canvas ref={ref} aria-label="Campus map with your position and selected route" role="img" style={{ width: size, height: Math.round(size * MAP_ASPECT) }} className="rounded-xl border border-line" />
            <p className="mt-3 flex justify-between text-xs text-muted"><span>↑ North · Brisbane, Australia</span><span className="text-accent">● You are here</span></p>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap gap-1.5" aria-label="Filter destinations">
              {GROUPS.map((group) => <button key={group.id} aria-pressed={filter === group.id} onClick={() => setFilter(group.id)} className={`rounded-full border px-3 py-2 text-xs transition-colors ${filter === group.id ? "border-accent/50 bg-accent/10 text-accent" : "border-line text-muted hover:text-ink"}`}>{group.label}</button>)}
            </div>
            <p className="my-4 text-sm text-muted">Pick a stop to follow a gold trail through the world.</p>
            <div className="max-h-80 space-y-1 overflow-y-auto pr-1 md:max-h-[365px]">
              {DESTINATIONS.filter((d) => filter === "all" || d.payload?.kind === filter).map((destination, i) => {
                const id = destinationId(destination);
                const seen = visited.includes(id);
                return <button key={id} onClick={() => { gameBus.emit("navigation:select", { id }); onClose(); }} className="destination-row group">
                  <span className={`destination-stamp ${seen ? "is-visited" : ""}`}>{seen ? "✓" : String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{destination.payload?.title ?? "River lookout"}</span><span className="mt-0.5 block text-xs text-muted">{destination.payload ? KIND_LABEL[destination.payload.kind] : "Brisbane river"}{seen ? " · Discovered" : ""}</span></span>
                  <span className="text-accent transition-transform group-hover:translate-x-1" aria-hidden>→</span>
                </button>;
              })}
            </div>
            <p className="mt-4 border-t border-line pt-3 text-xs text-muted">{visited.length} / {DESTINATIONS.length} discoveries saved on this device</p>
          </div>
        </div>
      </div>
    </div>
  );
}
