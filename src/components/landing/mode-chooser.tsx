"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion as m, useReducedMotion } from "motion/react";
import { profile } from "@content";
import { Counter } from "@/components/fx/counter";
import { Magnetic } from "@/components/fx/magnetic";
import { Ticker } from "@/components/fx/ticker";
import { TiltCard } from "@/components/fx/tilt-card";

/**
 * The front door: editorial identity block over two live panels, the 3D
 * campus and the one-page portfolio. Three.js loads lazily inside the
 * diorama only when it scrolls into view.
 */

const HeroDiorama = dynamic(
  () => import("@/game3d/hero-diorama").then((mod) => mod.HeroDiorama),
  { ssr: false },
);

const entrance = {
  hidden: { opacity: 0, y: 26 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.1 * i,
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

function PortfolioScene() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden bg-surface">
      {/* split identity backdrop */}
      <div className="absolute inset-y-0 left-0 w-1/2 bg-[#0b101d]" />
      <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-br from-[#10203a] to-[#123528]" />
      <div className="absolute inset-x-0 top-6 flex flex-col items-center gap-3 px-4">
        <span className="flex size-14 items-center justify-center rounded-full border-2 border-neon/60 bg-bg font-display text-lg font-bold text-neon">
          {profile.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </span>
        <p className="text-center font-display text-sm font-semibold tracking-wide text-ink">
          SOFTWARE ENGINEER <span className="text-neon">×</span> WORLD BUILDER
        </p>
        <p className="flex items-center gap-2 rounded-full border border-neon/40 bg-neon/10 px-3 py-1 text-[11px] text-neon">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-neon opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-neon" />
          </span>
          open to work
        </p>
        <div className="mt-1 flex gap-5 font-display text-xl font-bold text-ink/90">
          <span>
            <Counter to={5} />
            <span className="ml-1 text-[10px] font-normal text-muted">projects</span>
          </span>
          <span>
            <Counter to={2} />
            <span className="ml-1 text-[10px] font-normal text-muted">internships</span>
          </span>
          <span>
            <Counter to={25} suffix="%" />
            <span className="ml-1 text-[10px] font-normal text-muted">scholarship</span>
          </span>
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
  const reduced = useReducedMotion();

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-bg px-5 py-12">
      {/* ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(78,240,138,0.06), transparent), radial-gradient(ellipse 50% 35% at 85% 100%, rgba(83,216,255,0.05), transparent)",
        }}
      />

      {/* identity */}
      <m.header
        custom={0}
        variants={entrance}
        initial={reduced ? false : "hidden"}
        animate="show"
        className="relative z-10 w-full max-w-4xl"
      >
        <p className="font-mono text-xs tracking-[0.25em] text-muted">
          PORTFOLIO · {profile.location.toUpperCase()}
        </p>
        <h1 className="mt-3 font-display text-5xl font-bold tracking-tight text-ink sm:text-7xl">
          {profile.name}
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          I engineer software <span className="text-neon">and</span> build small
          worlds. Pick how you want to meet me.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <span className="flex items-center gap-2 rounded-full border border-neon/40 bg-neon/10 px-3 py-1 text-neon">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-neon opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-neon" />
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
      </m.header>

      {/* the two doors */}
      <div className="relative z-10 mt-10 grid w-full max-w-4xl gap-5 sm:grid-cols-2">
        <m.div
          custom={1}
          variants={entrance}
          initial={reduced ? false : "hidden"}
          animate="show"
        >
          <TiltCard className="rounded-2xl">
            <button
              type="button"
              onClick={() => onChoose("game")}
              className="group relative block h-72 w-full overflow-hidden rounded-2xl border border-line text-left transition-colors hover:border-neon/60 focus-visible:border-neon sm:h-96"
            >
              <HeroDiorama className="absolute inset-0" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-5 pt-16">
                <p className="font-display text-2xl font-bold text-white">
                  Explore the campus
                </p>
                <p className="mt-1 text-sm text-white/80">
                  A 3D world built from my resume. Walk it, poke things, find
                  the arcade.
                </p>
                <Magnetic className="mt-4 inline-block">
                  <span className="inline-block rounded-full bg-neon px-5 py-2 font-display text-sm font-semibold text-bg transition-transform group-hover:scale-105">
                    ▶ Press start
                  </span>
                </Magnetic>
              </div>
            </button>
          </TiltCard>
        </m.div>

        <m.div
          custom={2}
          variants={entrance}
          initial={reduced ? false : "hidden"}
          animate="show"
        >
          <TiltCard className="rounded-2xl">
            <button
              type="button"
              onClick={() => onChoose("portfolio")}
              className="group relative block h-72 w-full overflow-hidden rounded-2xl border border-line text-left transition-colors hover:border-cyan/60 focus-visible:border-cyan sm:h-96"
            >
              <PortfolioScene />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-5 pt-16">
                <p className="font-display text-2xl font-bold text-white">
                  Read the story
                </p>
                <p className="mt-1 text-sm text-white/80">
                  One beautiful page: experience, projects, and how to reach me.
                </p>
                <Magnetic className="mt-4 inline-block">
                  <span className="inline-block rounded-full bg-cyan px-5 py-2 font-display text-sm font-semibold text-bg transition-transform group-hover:scale-105">
                    Open portfolio
                  </span>
                </Magnetic>
              </div>
            </button>
          </TiltCard>
        </m.div>
      </div>

      {/* personality footer */}
      <m.footer
        custom={3}
        variants={entrance}
        initial={reduced ? false : "hidden"}
        animate="show"
        className="relative z-10 mt-10 w-full max-w-4xl"
      >
        <Ticker
          items={profile.funFacts}
          className="border-y border-line py-3 text-sm text-muted"
        />
        <p className="mt-4 text-center text-sm text-muted">
          In a hurry?{" "}
          <Link href="/resume" className="text-cyan underline-offset-4 hover:underline">
            Just the resume
          </Link>{" "}
          ·{" "}
          <Link href="/blog" className="text-cyan underline-offset-4 hover:underline">
            Blog
          </Link>
        </p>
      </m.footer>
    </div>
  );
}
