"use client";

import Link from "next/link";
import { motion as m, useReducedMotion } from "motion/react";
import { profile } from "@content";

const entrance = {
  hidden: { opacity: 0, y: 26 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.12 * i, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

function GameScene() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden bg-gradient-to-b from-[#5ba3e0] via-[#8ec4ec] to-[#c8e4f6]"
    >
      {/* sun */}
      <div className="absolute right-[14%] top-[12%] size-9 rounded-full bg-[#ffe9a3] shadow-[0_0_36px_10px_rgba(255,226,138,0.55)] sm:size-11" />
      {/* drifting clouds */}
      <div className="absolute left-0 top-[18%] h-5 w-28 rounded-full bg-white/85 motion-safe:animate-drift" />
      <div
        className="absolute left-0 top-[34%] h-4 w-20 rounded-full bg-white/70 motion-safe:animate-drift-slow"
        style={{ animationDelay: "-18s" }}
      />
      {/* distant skyline */}
      <div
        className="absolute bottom-[26%] left-0 h-[30%] w-full bg-[#9db4d4]"
        style={{ clipPath: "polygon(0 100%, 8% 55%, 14% 55%, 18% 30%, 24% 30%, 28% 62%, 38% 62%, 42% 18%, 50% 18%, 54% 48%, 64% 48%, 68% 34%, 76% 34%, 80% 58%, 90% 58%, 94% 42%, 100% 42%, 100% 100%)" }}
      />
      {/* river strip + lawn */}
      <div className="absolute bottom-[22%] h-[6%] w-full bg-[#4e94d4]" />
      <div className="absolute bottom-0 h-[22%] w-full bg-gradient-to-b from-[#63b569] to-[#4f9a55]" />
      {/* jacaranda */}
      <div className="absolute bottom-[19%] left-[12%]">
        <div className="size-7 rounded-full bg-[#9d7ce0]" />
        <div className="mx-auto h-4 w-1.5 bg-[#6d5137]" />
      </div>
      {/* character */}
      <div className="absolute bottom-[8%] left-[46%] motion-safe:animate-float">
        <div className="mx-auto size-3.5 rounded-full bg-[#f2c89b]" />
        <div className="mx-auto h-4 w-5 rounded-[3px] bg-[#6a3ba3]" />
        <div className="mx-auto flex gap-0.5">
          <div className="h-2.5 w-2 rounded-[1px] bg-[#26324f]" />
          <div className="h-2.5 w-2 rounded-[1px] bg-[#26324f]" />
        </div>
        <div className="mx-auto mt-1 h-1 w-6 rounded-full bg-black/25 blur-[1px]" />
      </div>
      {/* arcade accent on the lawn */}
      <div className="absolute bottom-[9%] right-[16%] h-8 w-6 rounded-sm bg-magenta/85 shadow-[0_0_18px_3px_rgba(255,107,214,0.4)]" />
    </div>
  );
}

function TerminalScene() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden bg-[#04070d] p-5">
      <div className="flex gap-1.5">
        <span className="size-2.5 rounded-full bg-magenta/70" />
        <span className="size-2.5 rounded-full bg-amber/70" />
        <span className="size-2.5 rounded-full bg-neon/70" />
      </div>
      <div className="mt-4 space-y-2 font-mono text-[11px] leading-relaxed text-neon/90 sm:text-xs">
        <p>
          <span className="text-cyan">visitor@portfolio</span>
          <span className="text-muted">:~$</span> whoami
        </p>
        <p className="text-ink/80">{profile.tagline}</p>
        <div className="hidden space-y-2 sm:block">
          <p>
            <span className="text-cyan">visitor@portfolio</span>
            <span className="text-muted">:~$</span> ls ./interfaces
          </p>
          <p className="text-ink/80">
            game_world/{" "}
            <span className="text-amber">terminal_v2 (building…)</span>
          </p>
        </div>
        <p>
          <span className="text-cyan">visitor@portfolio</span>
          <span className="text-muted">:~$</span>{" "}
          <span className="animate-blink">█</span>
        </p>
      </div>
      <span className="absolute right-4 top-4 rounded border border-amber/50 bg-amber/10 px-2 py-0.5 font-pixel text-[8px] text-amber">
        V2 · SOON
      </span>
    </div>
  );
}

export function ModeChooser({
  onChoose,
}: {
  onChoose: (mode: "game" | "terminal") => void;
}) {
  const reduced = useReducedMotion();

  return (
    <div className="crt-scanlines crt-flicker relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-bg px-5 py-12">
      {/* ambient background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(78,240,138,0.07), transparent), radial-gradient(ellipse 50% 35% at 80% 100%, rgba(255,107,214,0.06), transparent)",
        }}
      />

      <m.header
        custom={0}
        variants={entrance}
        initial={reduced ? false : "hidden"}
        animate="show"
        className="relative z-10 text-center"
      >
        <p className="font-pixel text-[10px] text-muted">
          ★ {profile.name} · {profile.location} ★
        </p>
        <h1 className="mt-4 font-pixel text-lg leading-relaxed text-ink sm:text-2xl">
          CHOOSE YOUR
          <span className="text-neon [text-shadow:0_0_18px_rgba(78,240,138,0.6)]">
            {" "}
            INTERFACE
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted">
          {profile.tagline}
        </p>
      </m.header>

      <div className="relative z-10 mt-10 grid w-full max-w-4xl gap-5 sm:grid-cols-2">
        <m.button
          custom={1}
          variants={entrance}
          initial={reduced ? false : "hidden"}
          animate="show"
          whileHover={reduced ? undefined : { scale: 1.02, y: -3 }}
          whileTap={{ scale: 0.985 }}
          type="button"
          onClick={() => onChoose("game")}
          className="group relative h-64 overflow-hidden rounded-xl border border-line text-left transition-colors hover:border-neon/70 focus-visible:border-neon sm:h-80"
        >
          <GameScene />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-4 pt-14">
            <p className="font-pixel text-[10px] text-neon">🎮 GAME WORLD</p>
            <p className="mt-2 text-sm text-ink/85">
              Walk through my resume - campus, offices, and a playable arcade.
            </p>
            <p className="mt-3 inline-block rounded border border-neon/60 bg-neon/15 px-3 py-1 font-pixel text-[9px] text-neon opacity-90 transition-all group-hover:bg-neon/25">
              PRESS START ▶
            </p>
          </div>
        </m.button>

        <m.button
          custom={2}
          variants={entrance}
          initial={reduced ? false : "hidden"}
          animate="show"
          whileHover={reduced ? undefined : { scale: 1.02, y: -3 }}
          whileTap={{ scale: 0.985 }}
          type="button"
          onClick={() => onChoose("terminal")}
          className="group relative h-64 overflow-hidden rounded-xl border border-line text-left transition-colors hover:border-cyan/70 focus-visible:border-cyan sm:h-80"
        >
          <TerminalScene />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-4 pt-14">
            <p className="font-pixel text-[10px] text-cyan">&gt;_ TERMINAL</p>
            <p className="mt-2 text-sm text-ink/85">
              Command-line mode for keyboard purists. Shipping in v2.
            </p>
            <p className="mt-3 inline-block rounded border border-cyan/60 bg-cyan/15 px-3 py-1 font-pixel text-[9px] text-cyan opacity-90 transition-all group-hover:bg-cyan/25">
              PEEK INSIDE ▶
            </p>
          </div>
        </m.button>
      </div>

      <m.footer
        custom={3}
        variants={entrance}
        initial={reduced ? false : "hidden"}
        animate="show"
        className="relative z-10 mt-10 text-center text-sm text-muted"
      >
        In a hurry?{" "}
        <Link href="/about" className="text-cyan underline-offset-4 hover:underline">
          Skip to the classic site
        </Link>{" "}
        ·{" "}
        <Link href="/resume" className="text-cyan underline-offset-4 hover:underline">
          Just the resume
        </Link>
      </m.footer>
    </div>
  );
}
