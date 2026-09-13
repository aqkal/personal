"use client";

import { animate, motion as m, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import { useMediaQuery } from "@/lib/use-media-query";

/** Counts up from 0 when scrolled into view. */
export function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  // Start at the final value so server-rendered and no-JS pages remain useful.
  // The animation resets to zero only when the value enters the viewport.
  const mv = useMotionValue(to);
  const rounded = useTransform(mv, (v) => `${Math.round(v)}${suffix}`);
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) { mv.set(to); return; }
    let stop: (() => void) | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          mv.set(0);
          const animation = animate(mv, to, { duration: 1.2, ease: "easeOut" });
          stop = () => animation.stop();
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => { io.disconnect(); stop?.(); };
  }, [mv, to, reduced]);

  return (
    <span ref={ref}>
      <m.span>{rounded}</m.span>
    </span>
  );
}
