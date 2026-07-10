"use client";

import Link from "next/link";
import {
  AnimatePresence,
  animate,
  motion as m,
  useMotionValue,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  certifications,
  education,
  experience,
  profile,
  projects,
  skills,
} from "@content";
import { TechBadges } from "@/components/badges";
import { formatRange } from "@/lib/dates";

/**
 * "The {name} system": a status-page + architecture dashboard over the same
 * content model as the 3D campus. Designed so a non-technical reader only
 * needs plain English and green dots; the CS flavor (service names, latency,
 * uptime) is garnish, never load-bearing.
 */

const reveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.45 },
} as const;

/* ------------------------------ counters ------------------------------ */

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
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

/* ------------------------------ services ------------------------------ */

interface Service {
  id: string;
  icon: string;
  name: string;
  sub: string;
  summary: string;
  render: () => React.ReactNode;
}

function DetailList({
  items,
}: {
  items: Array<{ heading: string; meta?: string; bullets: string[]; tech?: string[] }>;
}) {
  return (
    <div className="space-y-5">
      {items.map((item) => (
        <div key={item.heading}>
          <p className="font-medium text-ink">{item.heading}</p>
          {item.meta && <p className="text-xs text-muted">{item.meta}</p>}
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink/90">
            {item.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          {item.tech && (
            <div className="mt-2">
              <TechBadges items={item.tech} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const SERVICES: Service[] = [
  {
    id: "education",
    icon: "🎓",
    name: "Education",
    sub: "education-service · v3.x",
    summary: `${education[0]?.degree.split(":").pop()?.trim() ?? "Software Engineering"} at UQ, on a 25% scholarship renewed every semester.`,
    render: () => (
      <DetailList
        items={education.map((e) => ({
          heading: e.institution,
          meta: `${e.degree} · ${formatRange(e.start, e.end)}`,
          bullets: e.highlights,
        }))}
      />
    ),
  },
  {
    id: "experience",
    icon: "💼",
    name: "Work Experience",
    sub: "experience-api · 2 instances",
    summary: `${experience.length} internships. Currently building client sites at ${experience.find((e) => e.end === null)?.company ?? "DSR Branding"}.`,
    render: () => (
      <DetailList
        items={experience.map((e) => ({
          heading: `${e.role} · ${e.company}`,
          meta: formatRange(e.start, e.end),
          bullets: e.highlights,
          tech: e.tech,
        }))}
      />
    ),
  },
  {
    id: "projects",
    icon: "🚀",
    name: "Projects",
    sub: "projects-cluster · 5 deployments",
    summary: "From ship-hull computer vision to a full-stack rental platform. One of them is this website.",
    render: () => (
      <DetailList
        items={projects.map((p) => ({
          heading: `${p.name} (${p.year})`,
          meta: `${p.tagline} · ${p.context}`,
          bullets: p.highlights.slice(0, 3),
          tech: p.tech,
        }))}
      />
    ),
  },
  {
    id: "skills",
    icon: "🧰",
    name: "Skills",
    sub: "skills-registry",
    summary: `${skills.reduce((n, s) => n + s.skills.length, 0)} technologies across languages, web, engineering, and tooling.`,
    render: () => (
      <div className="space-y-4">
        {skills.map((cat) => (
          <div key={cat.id}>
            <p className="mb-2 text-sm font-medium text-ink">{cat.title}</p>
            <TechBadges items={cat.skills} />
          </div>
        ))}
        {certifications.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-ink">Certifications</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink/90">
              {certifications.map((c) => (
                <li key={c.id}>{c.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    ),
  },
];

/* ------------------------------ hire tracer ------------------------------ */

const TRACE_STEPS = [
  { label: "you", detail: "curious visitor", latency: "0ms" },
  { label: "send a message", detail: "the contact form works", latency: "~30s" },
  { label: "reply", detail: "messages get answered", latency: "same day" },
  { label: "interview", detail: "ask about any project", latency: "~1 week" },
  { label: "hire()", detail: "{ success: true }", latency: "🎉" },
];

function HireTracer() {
  const [runId, setRunId] = useState(0);
  const [running, setRunning] = useState(false);

  // safety net: never leave the button stuck if animations are throttled
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setRunning(false), 4500);
    return () => clearTimeout(t);
  }, [running]);

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">How hiring me works</h2>
          <p className="text-sm text-muted">
            Trace a request through the pipeline. No technical knowledge required.
          </p>
        </div>
        <button
          type="button"
          disabled={running}
          onClick={() => {
            setRunId((r) => r + 1);
            setRunning(true);
          }}
          className="rounded-lg border border-neon/50 bg-neon/10 px-4 py-2 text-sm font-medium text-neon transition-colors hover:bg-neon/20 disabled:opacity-50"
        >
          {running ? "Tracing…" : "▶ Run the trace"}
        </button>
      </div>

      <ol className="mt-5 space-y-0" key={runId}>
        {TRACE_STEPS.map((step, i) => (
          <li key={step.label} className="relative flex gap-3 pb-5 last:pb-0">
            {i < TRACE_STEPS.length - 1 && (
              <span className="absolute left-[7px] top-4 h-full w-px bg-line" aria-hidden />
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
            className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-neon/40 bg-neon/10 px-4 py-3"
          >
            <p className="text-sm text-neon">Trace complete. Every step is real, start it any time.</p>
            <Link
              href="/contact"
              className="ml-auto rounded-md bg-neon px-4 py-1.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
            >
              Send the first request
            </Link>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------ incidents ------------------------------ */

const INCIDENTS = [
  {
    title: "Merge conflict storm: 20+ developers, one game engine",
    status: "Resolved",
    detail:
      "CSSE3200 studio. Contained with code review, CI discipline, and test-driven development. No regressions shipped.",
    when: "2025",
  },
  {
    title: "Marine fouling detected on vessel hulls",
    status: "Resolved",
    detail:
      "Deployed a Python + OpenCV computer-vision pipeline to inspect ROV footage automatically (DECO3801).",
    when: "2026",
  },
  {
    title: "Elevated caffeine levels during exam block",
    status: "Monitoring",
    detail: "Within expected parameters for a software engineering student. The 25% scholarship remains unaffected.",
    when: "ongoing",
  },
];

/* ------------------------------ shell ------------------------------ */

export function StatusShell({
  onExit,
  onPlayGame,
}: {
  onExit: () => void;
  onPlayGame: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  // computed once on mount; this shell never renders on the server
  const [uptimeYears] = useState(() =>
    Math.max(
      1,
      Math.round(
        ((Date.now() -
          new Date(`${education[0]?.start ?? "2023-02"}-01`).getTime()) /
          (365.25 * 24 * 3600 * 1000)) *
          10,
      ) / 10,
    ),
  );

  return (
    <div className="min-h-dvh bg-bg text-ink">
      {/* top bar */}
      <div className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2.5">
          <p className="font-mono text-xs text-muted">
            status.{profile.name.split(" ")[0].toLowerCase()} · live
          </p>
          <div className="flex items-center gap-3 text-xs">
            <button type="button" onClick={onPlayGame} className="text-neon hover:underline">
              ▶ 3D campus
            </button>
            <Link href="/about" className="text-muted hover:text-ink">
              classic site
            </Link>
            <button
              type="button"
              onClick={onExit}
              title="Back to interface select"
              className="text-muted hover:text-ink"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-10">
        {/* status hero */}
        <m.header {...reveal} className="rounded-xl border border-neon/40 bg-neon/5 p-6">
          <div className="flex items-center gap-3">
            <span className="relative flex size-3.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-neon opacity-60" />
              <span className="relative inline-flex size-3.5 rounded-full bg-neon" />
            </span>
            <h1 className="text-xl font-semibold sm:text-2xl">
              All systems operational
            </h1>
          </div>
          <p className="mt-3 text-muted">
            {profile.name} · {profile.tagline}
          </p>
          <p className="mt-1 text-sm text-muted">
            {profile.availability} 📍 {profile.location}
          </p>
          <p className="mt-4 font-mono text-xs text-neon/80">
            uptime at UQ: {uptimeYears} years · incidents this week: 0 · deploys: frequent
          </p>
        </m.header>

        {/* metrics */}
        <m.section {...reveal} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { to: projects.length, label: "projects shipped" },
            { to: experience.length, label: "internships" },
            { to: 25, suffix: "%", label: "scholarship, every semester" },
            { to: skills.reduce((n, s) => n + s.skills.length, 0), label: "technologies" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-line bg-surface p-4 text-center">
              <p className="text-3xl font-bold text-neon">
                <Counter to={s.to} suffix={s.suffix ?? ""} />
              </p>
              <p className="mt-1 text-xs text-muted">{s.label}</p>
            </div>
          ))}
        </m.section>

        {/* services: click any card */}
        <m.section {...reveal}>
          <h2 className="mb-3 flex items-baseline gap-3 font-semibold">
            Components
            <span className="font-mono text-xs font-normal text-muted">
              click any card for the details
            </span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {SERVICES.map((svc) => {
              const isOpen = open === svc.id;
              return (
                <m.button
                  key={svc.id}
                  layout
                  type="button"
                  onClick={() => setOpen(isOpen ? null : svc.id)}
                  aria-expanded={isOpen}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    isOpen
                      ? "border-neon/60 bg-surface sm:col-span-2"
                      : "border-line bg-surface hover:border-neon/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{svc.icon}</span>
                    <div className="min-w-0">
                      <p className="font-semibold">{svc.name}</p>
                      <p className="truncate font-mono text-[11px] text-muted">{svc.sub}</p>
                    </div>
                    <span className="ml-auto flex items-center gap-1.5 rounded-full border border-neon/40 bg-neon/10 px-2 py-0.5 text-[11px] text-neon">
                      <span className="size-1.5 rounded-full bg-neon" /> operational
                    </span>
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted">{svc.summary}</p>
                  <AnimatePresence>
                    {isOpen && (
                      <m.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 border-t border-line pt-4">{svc.render()}</div>
                        <p className="mt-3 font-mono text-[11px] text-muted">click to collapse</p>
                      </m.div>
                    )}
                  </AnimatePresence>
                </m.button>
              );
            })}
          </div>
        </m.section>

        {/* the hire() trace */}
        <m.section {...reveal}>
          <HireTracer />
        </m.section>

        {/* incident history */}
        <m.section {...reveal}>
          <h2 className="mb-3 font-semibold">Incident history</h2>
          <ol className="overflow-hidden rounded-xl border border-line bg-surface">
            {INCIDENTS.map((inc) => (
              <li key={inc.title} className="border-b border-line px-4 py-3.5 last:border-b-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${
                      inc.status === "Resolved"
                        ? "border-neon/40 bg-neon/10 text-neon"
                        : "border-amber/40 bg-amber/10 text-amber"
                    }`}
                  >
                    {inc.status}
                  </span>
                  <p className="font-medium">{inc.title}</p>
                  <span className="ml-auto font-mono text-xs text-muted">{inc.when}</span>
                </div>
                <p className="mt-1.5 text-sm text-muted">{inc.detail}</p>
              </li>
            ))}
          </ol>
        </m.section>

        {/* footer CTA */}
        <m.footer {...reveal} className="rounded-xl border border-line bg-surface p-6 text-center">
          <h2 className="text-lg font-semibold">Add this system to your team</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Zero downtime, {projects.length} shipped projects, and a work ethic
            that keeps a 25% scholarship renewed.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/contact"
              className="rounded-lg bg-neon px-6 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
            >
              Get in touch
            </Link>
            <Link
              href="/resume"
              className="rounded-lg border border-line px-6 py-2.5 text-sm text-ink transition-colors hover:border-neon/40"
            >
              Full resume
            </Link>
            <button
              type="button"
              onClick={onPlayGame}
              className="rounded-lg border border-line px-6 py-2.5 text-sm text-cyan transition-colors hover:border-cyan/50"
            >
              ▶ Or walk the 3D campus
            </button>
          </div>
        </m.footer>
      </main>
    </div>
  );
}
