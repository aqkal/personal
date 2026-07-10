"use client";

import { animate, motion as m, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef } from "react";

/** Counts up from 0 when scrolled into view. */
export function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => `${Math.round(v)}${suffix}`);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animate(mv, to, { duration: 1.2, ease: "easeOut" });
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mv, to]);

  return (
    <span ref={ref}>
      <m.span>{rounded}</m.span>
    </span>
  );
}
