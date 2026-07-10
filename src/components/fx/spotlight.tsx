"use client";

import { motion as m, useMotionTemplate, useSpring } from "motion/react";
import { useEffect } from "react";
import { useMediaQuery } from "@/lib/use-media-query";

/**
 * Chiang-style cursor spotlight: a soft radial glow that follows the pointer
 * across the whole wrapped area. Desktop-only; invisible on touch/reduced.
 */
export function SpotlightArea({
  children,
  className,
  color = "78, 240, 138",
}: {
  children: React.ReactNode;
  className?: string;
  /** rgb triplet string for the glow */
  color?: string;
}) {
  const x = useSpring(-400, { stiffness: 120, damping: 24 });
  const y = useSpring(-400, { stiffness: 120, damping: 24 });
  const bg = useMotionTemplate`radial-gradient(620px at ${x}px ${y}px, rgba(${color}, 0.07), transparent 75%)`;
  const finePointer = useMediaQuery("(pointer: fine)");
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const enabled = finePointer && !reduced;

  useEffect(() => {
    if (!enabled) return;
    function onMove(e: PointerEvent) {
      x.set(e.clientX);
      y.set(e.clientY);
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [enabled, x, y]);

  return (
    <div className={`relative ${className ?? ""}`}>
      {enabled && (
        <m.div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0"
          style={{ background: bg }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
