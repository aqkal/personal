"use client";

import Link from "next/link";
import { AnimatePresence, motion as m } from "motion/react";
import { useEffect, useState } from "react";

/**
 * The pre-contact hook: trace a "request" through the hiring pipeline.
 * Plain English at every step; the latency column is the CS garnish.
 */
const TRACE_STEPS = [
  { label: "you", detail: "curious visitor", latency: "0ms" },
  { label: "send a message", detail: "the contact form works", latency: "~30s" },
  { label: "reply", detail: "messages get answered", latency: "same day" },
  { label: "interview", detail: "ask about any project", latency: "~1 week" },
  { label: "hire()", detail: "{ success: true }", latency: "🎉" },
];

export function HireTracer() {
  const [runId, setRunId] = useState(0);
  const [running, setRunning] = useState(false);

  // safety net: never leave the button stuck if animations are throttled
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setRunning(false), 4500);
    return () => clearTimeout(t);
  }, [running]);

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-semibold text-ink">
            How hiring me works
          </h3>
          <p className="text-sm text-muted">
            Trace a request through the pipeline. Every step is real.
          </p>
        </div>
        <button
          type="button"
          disabled={running}
          onClick={() => {
            setRunId((r) => r + 1);
            setRunning(true);
          }}
          className="btn-fx rounded-full border border-neon/50 bg-neon/10 px-5 py-2 text-sm font-medium text-neon hover:bg-neon/20 disabled:opacity-50"
        >
          {running ? "Tracing…" : "▶ Run the trace"}
        </button>
      </div>

      <ol className="mt-6" key={runId}>
        {TRACE_STEPS.map((step, i) => (
          <li key={step.label} className="relative flex gap-3 pb-5 last:pb-0">
            {i < TRACE_STEPS.length - 1 && (
              <span aria-hidden className="absolute left-[7px] top-4 h-full w-px bg-line" />
            )}
            <m.span
              initial={{ scale: 0.4, opacity: 0.25 }}
              animate={
                runId > 0
                  ? { scale: 1, opacity: 1, transition: { delay: 0.5 + i * 0.55 } }
                  : {}
              }
              onAnimationComplete={() => {
                if (i === TRACE_STEPS.length - 1) setRunning(false);
              }}
              className="relative z-10 mt-1 size-[15px] shrink-0 rounded-full border-2 border-neon bg-bg"
            >
              {runId > 0 && (
                <m.span
                  className="absolute inset-[2px] rounded-full bg-neon"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, transition: { delay: 0.5 + i * 0.55 } }}
                />
              )}
            </m.span>
            <m.div
              initial={{ opacity: 0.35 }}
              animate={runId > 0 ? { opacity: 1, transition: { delay: 0.5 + i * 0.55 } } : {}}
              className="flex flex-1 flex-wrap items-baseline gap-x-3"
            >
              <span className="font-mono text-sm font-medium text-ink">{step.label}</span>
              <span className="text-sm text-muted">{step.detail}</span>
              <span className="ml-auto font-mono text-xs text-cyan">{step.latency}</span>
            </m.div>
          </li>
        ))}
      </ol>

      <AnimatePresence>
        {runId > 0 && !running && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-neon/40 bg-neon/10 px-4 py-3"
          >
            <p className="text-sm text-neon">Trace complete. Start it any time.</p>
            <Link
              href="/contact"
              className="btn-fx ml-auto rounded-full bg-neon px-5 py-1.5 text-sm font-semibold text-bg"
            >
              Send the first request
            </Link>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
