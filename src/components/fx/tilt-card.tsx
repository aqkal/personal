"use client";

import {
  motion as m,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from "motion/react";
import { useRef } from "react";
import { useMediaQuery } from "@/lib/use-media-query";

/**
 * Pointer-tracked 3D tilt with a moving sheen highlight. Falls back to a
 * plain div on touch devices and under reduced motion.
 */
export function TiltCard({
  children,
  className,
  maxTilt = 5,
}: {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 220, damping: 20 });
  const sry = useSpring(ry, { stiffness: 220, damping: 20 });
  const sheenX = useMotionValue(50);
  const sheenY = useMotionValue(50);
  const sheen = useMotionTemplate`radial-gradient(420px at ${sheenX}% ${sheenY}%, rgba(255,255,255,0.08), transparent 65%)`;
  const finePointer = useMediaQuery("(pointer: fine)");
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");

  if (!finePointer || reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      ref={ref}
      className={`relative ${className ?? ""}`}
      style={{
        rotateX: srx,
        rotateY: sry,
        transformPerspective: 1000,
        transformStyle: "preserve-3d",
      }}
      onPointerMove={(e) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        ry.set((px - 0.5) * maxTilt * 2);
        rx.set(-(py - 0.5) * maxTilt * 2);
        sheenX.set(px * 100);
        sheenY.set(py * 100);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
    >
      {children}
      <m.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ background: sheen }}
      />
    </m.div>
  );
}
