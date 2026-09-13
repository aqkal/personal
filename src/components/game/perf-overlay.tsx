"use client";

import { useEffect, useState } from "react";
import { perfEnabled, perfStats } from "@/game3d/perf";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

/**
 * Opt-in frame readout. `outsideMs` includes browser scheduling and idle
 * frame time, so it is not a measure of CPU work. Compare callback, draw,
 * and GPU timings before attributing a slow frame to a subsystem.
 */
export function PerfOverlay() {
  const [, tick] = useState(0);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!perfEnabled()) return;
    const id = setInterval(() => tick((n) => n + 1), 400);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!perfEnabled()) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "`") setOpen((v) => !v);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!perfEnabled()) return null;

  const p = perfStats;
  const fpsColor =
    p.fps >= 55 ? "text-accent" : p.fps >= 45 ? "text-ink" : "text-red-400";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded border border-line bg-surface/95 px-2 py-1 font-mono text-[10px] shadow-sm ${fpsColor}`}
      >
        {p.fps} fps
      </button>
    );
  }

  return (
    <div className="w-[188px] rounded-md border border-line bg-surface/95 p-2 font-mono text-[10px] leading-[1.45] text-ink shadow-md">
      <div className="mb-1 flex justify-between gap-4">
        <span className={fpsColor}>{p.fps} fps</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted hover:text-accent"
          title="Hide (`)"
        >
          ×
        </button>
      </div>
      <Row label="frame" value={`${p.frameMs.toFixed(1)} ms`} />
      <Row label="cbs" value={`${p.cbMs.toFixed(2)} ms`} />
      <Row label="draw" value={`${p.drawMs.toFixed(2)} ms`} />
      <Row label="outside" value={`${p.outsideMs.toFixed(2)} ms`} />
      <Row
        label="gpu"
        value={p.gpuTimer ? `${p.gpuMs.toFixed(2)} ms` : "n/a"}
      />
      <Row label="shadow" value={`${p.shadowMs.toFixed(2)} ms`} />
      <div className="my-1 h-px bg-line" />
      <Row
        label="calls"
        value={`${p.calls}  (${p.shadowCalls} sh)`}
      />
      <Row label="tris" value={`${(p.triangles / 1000).toFixed(1)}k`} />
      <div className="my-1 h-px bg-line" />
      <Row label="tier" value={`${p.tier}  @${p.dpr.toFixed(2)}x`} />
      <Row label="shadowmap" value={p.shadowSize ? `${p.shadowSize}` : "off"} />
      <Row
        label="res"
        value={`${p.programs}p ${p.textures}t ${p.geometries}g`}
      />
    </div>
  );
}
