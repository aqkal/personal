"use client";

import { motion as m, useMotionValue, useSpring } from "motion/react";
import { useRef } from "react";
import { useMediaQuery } from "@/lib/use-media-query";

/**
 * Wraps a CTA so it leans toward the cursor and springs back on leave.
 * Renders a plain div on touch devices and under reduced motion.
 */
export function Magnetic({
  children,
  strength = 0.3,
  className,
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18 });
  const sy = useSpring(y, { stiffness: 260, damping: 18 });
  const finePointer = useMediaQuery("(pointer: fine)");
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");

  if (!finePointer || reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      ref={ref}
      className={className}
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        const clamp = (v: number) => Math.max(-14, Math.min(14, v));
        x.set(clamp((e.clientX - (rect.left + rect.width / 2)) * strength));
        y.set(clamp((e.clientY - (rect.top + rect.height / 2)) * strength));
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </m.div>
  );
}
