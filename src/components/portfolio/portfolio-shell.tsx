"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  education,
  experience,
  profile,
  projects,
  skills,
} from "@content";
import { TechBadges } from "@/components/badges";
import { Counter } from "@/components/fx/counter";
import { Reveal } from "@/components/fx/reveal";
import { SpotlightArea } from "@/components/fx/spotlight";
import { Ticker } from "@/components/fx/ticker";
import { accentFor } from "@/lib/accents";
import { formatRange } from "@/lib/dates";
import { CharacterPortrait } from "./character-portrait";
import { HireTracer } from "./hire-tracer";

/**
 * Interface 2: the Spotlight One-Pager. Chiang anatomy, Dannaway split hero,
 * Tamal funnel, Jhey living footer: one scroll, zero learning curve.
 */

export interface LatestPostMeta {
  slug: string;
  title: string;
  description: string;
  dateLabel: string;
  readingMinutes: number;
}

const SECTIONS = [
  { id: "about", label: "About" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "contact", label: "Contact" },
] as const;

function useScrollSpy(ids: readonly string[]): string {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        { rootMargin: "-35% 0px -55% 0px" },
      );
      io.observe(el);
      observers.push(io);
    }
    return () => observers.forEach((io) => io.disconnect());
  }, [ids]);
  return active;
}

function BrisbaneClock() {
  const [time, setTime] = useState(() =>
    new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Brisbane",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date()),
  );
  useEffect(() => {
    const t = setInterval(() => {
      setTime(
        new Intl.DateTimeFormat("en-AU", {
          timeZone: "Australia/Brisbane",
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date()),
      );
    }, 30_000);
    return () => clearInterval(t);
  }, []);
  return <span suppressHydrationWarning>{time}</span>;
}

export function PortfolioShell({
  onExit,
  onPlayGame,
  latestPost,
}: {
  onExit: () => void;
  onPlayGame: () => void;
  latestPost: LatestPostMeta | null;
}) {
  const active = useScrollSpy(SECTIONS.map((s) => s.id));
  const currentJob = experience.find((e) => e.end === null);
  const featured = projects.filter((p) => p.featured);
  const others = projects.filter((p) => !p.featured);
  const techCount = skills.reduce((n, s) => n + s.skills.length, 0);
  const heroRef = useRef<HTMLDivElement>(null);

  return (
    <SpotlightArea className="min-h-dvh bg-bg text-ink">
      {/* top chrome */}
      <div className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3">
          <nav aria-label="Sections" className="flex items-center gap-4 text-sm">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`transition-colors ${
                  active === s.id
                    ? "font-medium text-neon"
                    : "text-muted hover:text-ink"
                }`}
              >
                {s.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={onPlayGame}
              className="hidden text-neon hover:underline sm:block"
            >
              ▶ 3D campus
            </button>
            <Link href="/about" className="hidden text-muted hover:text-ink sm:block">
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

      <main className="mx-auto max-w-4xl px-5">
        {/* split-identity hero */}
        <section ref={heroRef} className="grid items-center gap-8 py-16 sm:grid-cols-[1.2fr_1fr] sm:py-20">
          <Reveal>
            <p className="font-mono text-xs tracking-[0.25em] text-muted">
              {profile.location.toUpperCase()}
            </p>
            <h1 className="mt-3 font-display text-5xl font-bold tracking-tight sm:text-6xl">
              {profile.name}
            </h1>
            <p className="mt-3 font-display text-xl text-muted sm:text-2xl">
              <span className="text-ink">Software engineer</span>{" "}
              <span className="text-neon">×</span>{" "}
              <span className="text-ink">world builder</span>
            </p>
            <p className="mt-5 max-w-md leading-relaxed text-muted">
              {profile.tagline} Studying{" "}
              {education[0]?.degree.split(":").pop()?.trim().toLowerCase()} at
              UQ and shipping real software while I do it.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-2 rounded-full border border-neon/40 bg-neon/10 px-3 py-1.5 text-sm text-neon">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-neon opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-neon" />
                </span>
                open to work
              </span>
              <a
                href={profile.socials.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted transition-colors hover:text-ink"
              >
                GitHub ↗
              </a>
              <a
                href={profile.socials.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted transition-colors hover:text-ink"
              >
                LinkedIn ↗
              </a>
            </div>
          </Reveal>
          <Reveal delay={0.15} className="mx-auto">
            <CharacterPortrait className="size-56 sm:size-72" />
            <p className="mt-2 text-center font-mono text-[11px] text-muted">
              me, in the 3D campus ·{" "}
              <button type="button" onClick={onPlayGame} className="text-neon hover:underline">
                say hi in person
              </button>
            </p>
          </Reveal>
        </section>

        {/* proof strip */}
        <Reveal>
          <Ticker
            items={[
              "University of Queensland",
              "25% scholarship, every semester",
              ...experience.map((e) => e.company),
              `${projects.length} shipped projects`,
              `${techCount} technologies`,
            ]}
            className="border-y border-line py-3 text-sm text-muted"
          />
        </Reveal>

        {/* about */}
        <section id="about" className="scroll-mt-24 py-16">
          <Reveal>
            <h2 className="font-display text-3xl font-bold">About</h2>
            <div className="mt-5 max-w-2xl space-y-4 leading-relaxed text-ink/90">
              <p>
                I care about software that is engineered properly and feels
                great to use. That is why this portfolio is a walkable 3D
                campus and the page you are reading, rendered from the same
                typed content model.
              </p>
              <p>
                By day I am a {currentJob?.role.toLowerCase()} at{" "}
                {currentJob?.company}, building and shipping production client
                sites. At university I have led coursework from computer
                vision for ship hulls to a microservices platform deployed
                with Terraform.
              </p>
            </div>
            <ul className="mt-6 flex max-w-2xl flex-wrap gap-2">
              {profile.funFacts.map((fact) => (
                <li
                  key={fact}
                  className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-muted transition-colors hover:border-neon/40 hover:text-ink"
                >
                  {fact}
                </li>
              ))}
            </ul>
          </Reveal>
        </section>

        {/* experience */}
        <section id="experience" className="scroll-mt-24 py-16">
          <Reveal>
            <h2 className="font-display text-3xl font-bold">Experience</h2>
          </Reveal>
          <ol className="mt-8 space-y-2">
            {experience.map((job, i) => (
              <Reveal key={job.id} delay={i * 0.06}>
                <li className="group grid gap-2 rounded-2xl border border-transparent p-5 transition-all hover:border-line hover:bg-surface/80 hover:shadow-[0_8px_30px_-12px_rgba(78,240,138,0.15)] sm:grid-cols-[150px_1fr] sm:gap-6">
                  <p className="flex items-start gap-2 font-mono text-xs leading-6 text-muted">
                    {job.end === null && (
                      <span className="relative mt-2 flex size-2 shrink-0">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-neon opacity-60" />
                        <span className="relative inline-flex size-2 rounded-full bg-neon" />
                      </span>
                    )}
                    {formatRange(job.start, job.end)}
                  </p>
                  <div>
                    <h3 className="font-display text-lg font-semibold group-hover:text-neon">
                      {job.role} · {job.company}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">
                      {job.summary}
                    </p>
                    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink/85">
                      {job.highlights.slice(0, 3).map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                    <div className="mt-3">
                      <TechBadges items={job.tech} />
                    </div>
                  </div>
                </li>
              </Reveal>
            ))}
            {education.map((edu) => (
              <Reveal key={edu.id} delay={0.12}>
                <li className="group grid gap-2 rounded-2xl border border-transparent p-5 transition-all hover:border-line hover:bg-surface/80 sm:grid-cols-[150px_1fr] sm:gap-6">
                  <p className="font-mono text-xs leading-6 text-muted">
                    {formatRange(edu.start, edu.end)}
                  </p>
                  <div>
                    <h3 className="font-display text-lg font-semibold group-hover:text-amber">
                      {edu.degree.split(":").pop()?.trim()} · {edu.institution}
                    </h3>
                    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink/85">
                      {edu.highlights.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
          <Reveal>
            <Link
              href="/resume"
              className="mt-6 inline-block text-sm text-cyan underline-offset-4 hover:underline"
            >
              View the full resume →
            </Link>
          </Reveal>
        </section>

        {/* projects */}
        <section id="projects" className="scroll-mt-24 py-16">
          <Reveal>
            <h2 className="font-display text-3xl font-bold">
              Featured projects
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {featured.map((p, i) => {
              const accent = accentFor(projects.indexOf(p));
              return (
                <Reveal key={p.id} delay={i * 0.07} className={i === 0 ? "sm:col-span-2" : ""}>
                  <Link
                      href={`/projects/${p.id}`}
                      className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-[var(--accent)]"
                      style={{ "--accent": accent } as React.CSSProperties}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <h3
                          className="font-display text-xl font-semibold transition-colors group-hover:text-[var(--accent)]"
                        >
                          {p.name}
                        </h3>
                        <span className="font-mono text-xs text-muted">{p.year}</span>
                      </div>
                      <p className="mt-1 text-sm font-medium" style={{ color: accent }}>
                        {p.tagline}
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-muted">
                        {p.description}
                      </p>
                      <div className="mt-auto pt-4">
                        <TechBadges items={p.tech} />
                        <p className="mt-3 text-sm text-cyan opacity-0 transition-opacity group-hover:opacity-100">
                          Read the case study →
                        </p>
                      </div>
                    </Link>
                </Reveal>
              );
            })}
          </div>
          {others.length > 0 && (
            <Reveal>
              <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface">
                {others.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/projects/${p.id}`}
                      className="group flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-raised"
                    >
                      <span className="font-display font-semibold group-hover:text-neon">
                        {p.name}
                      </span>
                      <span className="text-sm text-muted">{p.tagline}</span>
                      <span className="ml-auto font-mono text-xs text-muted">
                        {p.year} →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </section>

        {/* numbers + trace */}
        <section className="py-16">
          <Reveal>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { to: projects.length, label: "projects shipped" },
                { to: experience.length, label: "internships" },
                { to: 25, suffix: "%", label: "scholarship, kept" },
                { to: techCount, label: "technologies" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-line bg-surface p-4 text-center"
                >
                  <p className="font-display text-3xl font-bold text-neon">
                    <Counter to={s.to} suffix={s.suffix ?? ""} />
                  </p>
                  <p className="mt-1 text-xs text-muted">{s.label}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.1} className="mt-5">
            <HireTracer />
          </Reveal>
        </section>

        {/* writing */}
        {latestPost && (
          <section className="py-8">
            <Reveal>
              <Link
                href={`/blog/${latestPost.slug}`}
                className="group block rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-cyan/50"
              >
                <p className="font-mono text-xs text-muted">
                  LATEST WRITING · {latestPost.dateLabel} · {latestPost.readingMinutes} min
                </p>
                <h3 className="mt-2 font-display text-xl font-semibold group-hover:text-cyan">
                  {latestPost.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {latestPost.description}
                </p>
              </Link>
              <Link
                href="/blog"
                className="mt-3 inline-block text-sm text-cyan underline-offset-4 hover:underline"
              >
                All posts →
              </Link>
            </Reveal>
          </section>
        )}

        {/* say hello */}
        <section id="contact" className="scroll-mt-24 py-20 text-center">
          <Reveal>
            <h2 className="font-display text-4xl font-bold sm:text-5xl">
              Say hello<span className="text-neon">.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md leading-relaxed text-muted">
              {profile.availability} Messages get answered, usually the same
              day.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                  href="/contact"
                  className="inline-block rounded-full bg-neon px-8 py-3 font-display font-semibold text-bg transition-opacity hover:opacity-90"
                >
                  Start a conversation
                </Link>
              <a
                href={`mailto:${profile.email}`}
                className="text-sm text-muted transition-colors hover:text-ink"
              >
                or email {profile.email}
              </a>
            </div>
          </Reveal>
        </section>
      </main>

      {/* living footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-6 text-xs text-muted">
          <p className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-neon opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-neon" />
            </span>
            currently building at {currentJob?.company ?? "UQ"} · it&apos;s{" "}
            <BrisbaneClock /> in Brisbane
          </p>
          <p>
            built with Next.js, three.js, and Tailwind ·{" "}
            <button type="button" onClick={onPlayGame} className="text-neon hover:underline">
              psst: there is a whole 3D campus
            </button>
          </p>
        </div>
      </footer>
    </SpotlightArea>
  );
}
