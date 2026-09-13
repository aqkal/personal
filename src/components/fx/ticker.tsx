"use client";

import { useState } from "react";
import { useMediaQuery } from "@/lib/use-media-query";

/**
 * Infinite marquee. Content is rendered twice and slid -50%; pauses on
 * hover; static single row under reduced motion.
 */
export function Ticker({
  items,
  className,
  durationSeconds = 36,
}: {
  items: string[];
  className?: string;
  durationSeconds?: number;
}) {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [paused, setPaused] = useState(false);

  const renderRow = (hidden: boolean) =>
    items.map((item, i) => (
      <span
        key={`${hidden ? "b" : "a"}-${i}`}
        aria-hidden={hidden || undefined}
        className="flex shrink-0 items-center gap-3"
      >
        <span>{item}</span>
        <span aria-hidden className="text-accent">
          ✦
        </span>
      </span>
    ));

  if (reduced) {
    return (
      <div className={`flex flex-wrap items-center gap-3 ${className ?? ""}`}>
        {renderRow(false)}
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Highlights"
      tabIndex={0}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)] focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${className ?? ""}`}
    >
      <div
        className="flex w-max items-center gap-3 animate-marquee hover:[animation-play-state:paused]"
        style={{ animationDuration: `${durationSeconds}s`, animationPlayState: paused ? "paused" : undefined }}
      >
        {renderRow(false)}
        {renderRow(true)}
      </div>
    </div>
  );
}
