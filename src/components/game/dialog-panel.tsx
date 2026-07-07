"use client";

import Link from "next/link";
import { AnimatePresence, motion as m } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  education,
  experience,
  projects,
  skills,
} from "@content";
import { gameBus, type PanelPayload } from "@/game/bus";
import { TechBadges } from "@/components/badges";
import { formatRange } from "@/lib/dates";
import { SnakeGame } from "./snake-game";

/**
 * Typewriter that reveals dialog lines. The parent skips it by flipping
 * `skip` (from its own event handler); natural completion reports via
 * onDone from the timer callback.
 */
function Typewriter({
  lines,
  onDone,
  skip,
}: {
  lines: string[];
  onDone: () => void;
  skip: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const full = lines.join("\n");
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => {
        if (i >= full.length) {
          clearInterval(t);
          onDoneRef.current();
          return i;
        }
        return i + 1;
      });
    }, 16);
    return () => clearInterval(t);
  }, [full]);

  const display = skip ? full : full.slice(0, idx);
  return (
    <p className="whitespace-pre-line font-mono text-sm leading-relaxed text-ink/95">
      {display}
      <span className="animate-blink text-neon">▌</span>
    </p>
  );
}

function Detail({ payload }: { payload: PanelPayload }) {
  switch (payload.kind) {
    case "experience": {
      const job = experience.find((e) => e.id === payload.id);
      if (!job) return null;
      return (
        <div>
          <p className="text-sm text-muted">
            {job.role} · {formatRange(job.start, job.end)}
            {job.location ? ` · ${job.location}` : ""}
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
            {job.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          <div className="mt-3">
            <TechBadges items={job.tech} />
          </div>
          <Link href="/experience" className="mt-4 inline-block text-sm text-cyan hover:underline">
            Full career timeline →
          </Link>
        </div>
      );
    }
    case "education": {
      const edu = education.find((e) => e.id === payload.id);
      if (!edu) return null;
      return (
        <div>
          <p className="text-sm text-muted">
            {edu.degree} · {formatRange(edu.start, edu.end)}
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
            {edu.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          <Link href="/about" className="mt-4 inline-block text-sm text-cyan hover:underline">
            More about me →
          </Link>
        </div>
      );
    }
    case "project": {
      const p = projects.find((p) => p.id === payload.id);
      if (!p) return null;
      return (
        <div>
          <p className="text-sm font-medium text-cyan">{p.tagline}</p>
          <p className="mt-1 text-xs text-muted">
            {p.context} · {p.year}
          </p>
          <p className="mt-3 text-sm leading-relaxed">{p.description}</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
            {p.highlights.slice(0, 3).map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          <div className="mt-3">
            <TechBadges items={p.tech} />
          </div>
          <Link href="/projects" className="mt-4 inline-block text-sm text-cyan hover:underline">
            All projects →
          </Link>
        </div>
      );
    }
    case "skills": {
      const cat = skills.find((s) => s.id === payload.id);
      if (!cat) return null;
      return (
        <div>
          <ul className="flex flex-wrap gap-2">
            {cat.skills.map((s) => (
              <li
                key={s}
                className="rounded border border-neon/30 bg-neon/10 px-2.5 py-1 text-sm text-neon"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case "blog":
      return (
        <div>
          <p className="text-sm leading-relaxed">
            Build logs, write-ups, and lessons learned - including how this
            entire world was made.
          </p>
          <Link
            href="/blog"
            className="mt-4 inline-block rounded border border-neon/50 bg-neon/10 px-4 py-2 text-sm font-medium text-neon transition-colors hover:bg-neon/20"
          >
            Enter the café (read the blog) →
          </Link>
        </div>
      );
    case "contact":
      return (
        <div>
          <p className="text-sm leading-relaxed">
            Recruiters, collaborators, and fellow builders welcome. Messages
            get answered.
          </p>
          <Link
            href="/contact"
            className="mt-4 inline-block rounded border border-neon/50 bg-neon/10 px-4 py-2 text-sm font-medium text-neon transition-colors hover:bg-neon/20"
          >
            Send a message →
          </Link>
        </div>
      );
    case "snake":
      return <SnakeGame />;
  }
}

export function DialogPanel() {
  const [payload, setPayload] = useState<PanelPayload | null>(null);
  const [typed, setTyped] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const openedAt = useRef(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOpen = (p: PanelPayload) => {
      openedAt.current = Date.now();
      setTyped(false);
      setSkipped(false);
      setPayload(p);
    };
    gameBus.on("panel:open", onOpen);
    return () => gameBus.off("panel:open", onOpen);
  }, []);

  const close = useCallback(() => {
    setPayload(null);
    gameBus.emit("panel:close");
  }, []);

  // keyboard: Esc closes; E/Enter/Space skips the typewriter.
  useEffect(() => {
    if (!payload) return;
    boxRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      // the same keypress that opened the panel also fires keydown here - ignore it
      if (Date.now() - openedAt.current < 350) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (["e", "E", "Enter", " "].includes(e.key)) {
        // let buttons/links/snake handle their own keys once typing is done
        const target = e.target as HTMLElement;
        if (target.closest("a,button,[data-game]")) return;
        e.preventDefault();
        setSkipped(true);
        setTyped(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [payload, close]);

  return (
    <AnimatePresence>
      {payload && (
        <m.div
          key={payload.kind + payload.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 flex items-end justify-center bg-black/30 p-4 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <m.div
            ref={boxRef}
            role="dialog"
            aria-modal="true"
            aria-label={payload.title}
            tabIndex={-1}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="crt-scanlines relative w-full max-w-2xl rounded-xl border-2 border-neon/50 bg-[#0b1120f2] shadow-[0_0_50px_-12px_rgba(78,240,138,0.45)] backdrop-blur-md"
          >
            {/* header */}
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h2 className="font-pixel text-[10px] text-neon">
                {payload.title.toUpperCase()}
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close dialog"
                className="rounded px-2 py-1 text-sm text-muted transition-colors hover:text-ink"
              >
                ✕
              </button>
            </div>

            {/* body */}
            <div className="max-h-[55dvh] overflow-y-auto px-5 py-4">
              <Typewriter
                lines={payload.dialog}
                skip={skipped}
                onDone={() => setTyped(true)}
              />
              {typed && (
                <m.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 border-t border-line pt-4"
                >
                  <Detail payload={payload} />
                </m.div>
              )}
            </div>

            <p className="border-t border-line px-5 py-2 text-right font-pixel text-[8px] text-muted">
              ESC · CLOSE
            </p>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
