"use client";

import { motion as m } from "motion/react";
import { useMediaQuery } from "@/lib/use-media-query";

/** Standard scroll-in entrance used across v2 sections. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  return (
    <m.div
      className={className}
      // Keep SSR, no-JS, and reduced-motion output visible.
      initial={false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -24px 0px", amount: 0.08 }}
      transition={{ duration: reduced ? 0 : 0.58, delay: reduced ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.div>
  );
}
