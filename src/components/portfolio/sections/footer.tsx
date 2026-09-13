"use client";

import { useEffect, useState } from "react";
import { experience } from "@content";
import { PulseDot } from "../ticket";

const brisbaneTime = () =>
  new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Brisbane",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());

function useBrisbaneTime(): string {
  const [time, setTime] = useState(brisbaneTime);
  useEffect(() => {
    const t = setInterval(() => setTime(brisbaneTime()), 30_000);
    return () => clearInterval(t);
  }, []);
  return time;
}

export function FooterSection({ onPlayGame }: { onPlayGame: () => void }) {
  const currentJob = experience.find((e) => e.end === null);
  const time = useBrisbaneTime();

  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-5 py-6 font-mono text-[11px] text-muted">
        <p className="flex items-center gap-2">
          <PulseDot />
          currently building at {currentJob?.company ?? "UQ"}
        </p>
        <p suppressHydrationWarning>Brisbane · {time}</p>
        <button
          type="button"
          onClick={onPlayGame}
          className="microlabel link-underline text-accent"
        >
          Enter the 3D campus →
        </button>
      </div>
    </footer>
  );
}
