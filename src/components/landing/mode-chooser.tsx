"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { education, experience, profile, projects, siteUi } from "@content";
import { Counter } from "@/components/fx/counter";
import { Ticker } from "@/components/fx/ticker";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * The front door: editorial identity block over two live panels, the 3D
 * campus and the one-page portfolio. Three.js loads lazily inside the
 * diorama only when it scrolls into view.
 */

const HeroDiorama = dynamic(
  () => import("@/game3d/hero-diorama").then((mod) => mod.HeroDiorama),
  { ssr: false },
);

/** A miniature mock of the one-pager so the door reads as a real preview. */
function PortfolioScene() {
  const initials = profile.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden bg-gradient-to-b from-raised via-surface to-bg"
    >
      <div className="absolute inset-x-4 top-4 rounded-xl border border-line bg-bg/80 p-4 shadow-lg">
        {/* mini hero */}
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-accent/60 bg-surface font-display text-sm font-bold text-accent">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold text-ink">
              {profile.name}
            </p>
            <p className="truncate text-[11px] text-muted">
              {education[0].degree.split(":").pop()?.trim()} at UQ
            </p>
          </div>
          <span className="ml-auto flex items-center gap-1.5 whitespace-nowrap rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
            </span>
            open to work
          </span>
        </div>
        {/* mini stats */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { v: <Counter to={projects.length} />, l: "projects" },
            { v: <Counter to={experience.filter((job) => /intern/i.test(job.role)).length} />, l: "internships" },
            { v: <Counter to={25} suffix="%" />, l: "scholarship" },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-lg border border-line bg-surface px-2 py-1.5 text-center"
            >
              <p className="font-display text-base font-bold text-accent">{s.v}</p>
              <p className="text-[9px] text-muted">{s.l}</p>
            </div>
          ))}
        </div>
        {/* mini experience rows (hidden on short mobile panels) */}
        <div className="mt-3 hidden space-y-2 sm:block">
          {experience.map((job) => (
            <div
              key={job.id}
              className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5"
            >
              <span
                className={`size-1.5 shrink-0 rounded-full ${
                  job.end === null ? "bg-accent" : "bg-muted/60"
                }`}
              />
              <p className="truncate text-[11px] text-ink/90">
                {job.role} · {job.company}
              </p>
            </div>
          ))}
          <div className="flex gap-2">
            {[0.9, 0.55, 0.3].map((alpha) => (
              <div
                key={alpha}
                className="h-6 flex-1 rounded-lg border border-line bg-surface"
                style={{
                  borderBottomColor: `color-mix(in oklab, var(--accent) ${alpha * 100}%, transparent)`,
                  borderBottomWidth: 2,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ModeChooser({
  onChoose,
}: {
  onChoose: (mode: "game" | "portfolio") => void;
}) {
  return (
    <main className="grain relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-bg px-5 py-12">
      <div className="js-only absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      {/* ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(167,139,250,0.06), transparent), radial-gradient(ellipse 50% 35% at 85% 100%, rgba(230,183,97,0.05), transparent)",
        }}
      />

      {/* identity */}
      <header
        className="relative z-10 w-full max-w-4xl"
      >
        <p className="microlabel font-mono text-muted">
          PORTFOLIO · {profile.location.toUpperCase()}
        </p>
        <h1 className="mt-3 font-display text-[clamp(3rem,7vw,5.5rem)] font-bold leading-none tracking-tight text-ink">
          {profile.name}
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          I engineer software <span className="text-accent">and</span> build small
          worlds. Explore the campus or read the portfolio.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <span className="microlabel inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3.5 py-2 font-mono text-accent">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
            </span>
            {profile.availability}
          </span>
          <a
            href={profile.socials.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted transition-colors hover:text-ink"
          >
            GitHub ↗
          </a>
          <a
            href={profile.socials.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted transition-colors hover:text-ink"
          >
            LinkedIn ↗
          </a>
          <a
            href={`mailto:${profile.email}`}
            className="text-muted transition-colors hover:text-ink"
          >
            {profile.email}
          </a>
        </div>
      </header>

      <noscript>
        <style>{`.js-only { display: none !important; }`}</style>
        <p className="relative z-10 mt-8 max-w-xl text-center text-muted">
          {siteUi.noJavaScript}
        </p>
      </noscript>

      {/* the two doors */}
      <div className="js-only relative z-10 mt-10 grid w-full max-w-4xl gap-5 sm:grid-cols-2">
        <div>
          <button
              type="button"
              onClick={() => onChoose("game")}
              className="card-fx group relative block h-72 w-full overflow-hidden rounded-2xl border border-line text-left hover:border-accent/60 focus-visible:border-accent sm:h-96"
            >
              <HeroDiorama className="absolute inset-0" />
              <span className="microlabel absolute left-4 top-4 rounded border border-white/20 bg-black/45 px-2.5 py-1 font-mono text-white/90 backdrop-blur-sm">
                01 · 3D world
              </span>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/65 to-transparent p-5 pt-20">
                <p className="font-display text-2xl font-bold text-white">
                  Explore the campus
                </p>
                <p className="mt-1 text-sm text-white/80">
                  A 3D world built from my resume. Walk it, poke things, find
                  the arcade.
                </p>
                <span className="mt-4 inline-block rounded-full bg-accent px-5 py-2 font-display text-sm font-semibold text-on-accent transition-transform group-hover:scale-105">
                    ▶ Press start
                  </span>
              </div>
            </button>
        </div>

        <div>
          <button
              type="button"
              onClick={() => onChoose("portfolio")}
              className="card-fx group relative block h-72 w-full overflow-hidden rounded-2xl border border-line text-left hover:border-accent/60 focus-visible:border-accent sm:h-96"
            >
              <PortfolioScene />
              <span className="microlabel absolute left-4 top-4 rounded border border-line bg-bg/60 px-2.5 py-1 font-mono text-muted backdrop-blur-sm">
                02 · One-pager
              </span>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/65 to-transparent p-5 pt-20">
                <p className="font-display text-2xl font-bold text-white">
                  Read the story
                </p>
                <p className="mt-1 text-sm text-white/80">
                  One beautiful page: experience, projects, and how to reach me.
                </p>
                <span className="mt-4 inline-block rounded-full bg-accent px-5 py-2 font-display text-sm font-semibold text-on-accent transition-transform group-hover:scale-105">
                    Open portfolio
                  </span>
              </div>
            </button>
        </div>
      </div>

      {/* personality footer */}
      <footer
        className="relative z-10 mt-10 w-full max-w-4xl"
      >
        <Ticker
          items={profile.funFacts}
          className="border-y border-line py-3.5 text-sm text-muted"
        />
        <p className="mt-4 text-center text-sm text-muted">
          In a hurry?{" "}
          <Link href="/resume" className="text-accent underline-offset-4 hover:underline">
            Just the resume
          </Link>{" "}
          ·{" "}
          <Link href="/blog" className="text-accent underline-offset-4 hover:underline">
            Blog
          </Link>
        </p>
      </footer>
    </main>
  );
}
