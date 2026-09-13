"use client";

import Link from "next/link";
import { education, experience, profile, projects } from "@content";
import { Reveal } from "@/components/fx/reveal";
import { CharacterPortrait } from "../character-portrait";

export function HeroSection({ onPlayGame }: { onPlayGame: () => void }) {
  const words = profile.name.split(" ");
  const lead = words.slice(0, -1).join(" ");
  const last = words.at(-1);
  const internships = experience.filter((job) => /intern/i.test(job.role)).length;
  const current = experience.find((job) => job.end === null);
  return (
    <section id="top" className="relative grid items-center gap-12 pb-16 pt-40 sm:pb-20 md:min-h-[88dvh] md:grid-cols-[1.4fr_1fr] md:gap-16">
      <Reveal>
        <p className="hero-index font-mono">{profile.location}</p>
        <h1 className="mt-6 font-display text-[clamp(3.7rem,8.5vw,7rem)] font-semibold leading-[0.95] tracking-[-0.065em]">
          {lead && <>{lead}<br /></>}<span className="text-accent">{last}</span><span className="text-accent">.</span>
        </h1>
        <p className="mt-7 max-w-lg text-pretty text-xl leading-relaxed text-muted">{profile.tagline}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#projects" className="primary-action">Explore my work <span aria-hidden>↘</span></a>
          <Link href="/resume" className="secondary-action">View résumé <span aria-hidden>↗</span></Link>
        </div>
        <p className="mt-5 flex max-w-lg items-start gap-2.5 text-sm leading-relaxed text-muted"><span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />{profile.availability}</p>
        <div className="hero-proof">
          <div><strong>{String(projects.length).padStart(2, "0")}</strong><span>Projects built</span></div>
          <div><strong>{String(internships).padStart(2, "0")}</strong><span>Industry internships</span></div>
          <div><strong>UQ</strong><span>{education[0]?.degree.split(":").pop()?.trim()}</span></div>
        </div>
      </Reveal>
      <Reveal delay={0.12} className="mx-auto w-full max-w-[350px] md:ml-auto">
        <div className="hero-profile-card transition-[transform,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-5 py-4 font-mono text-xs text-muted"><span>FIELD NOTES / 001</span><span className="text-accent">BNE, AU</span></div>
          <div className="hero-profile-stage"><CharacterPortrait className="relative z-10 h-[290px] w-full sm:h-[320px]" /></div>
          <div className="border-t border-line p-5">
            <p className="font-display text-xl font-semibold">A little world of my work.</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">Walk through the campus. Discover the projects, people, and ideas behind this résumé.</p>
          <button type="button" onClick={onPlayGame} className="mt-5 flex min-h-11 w-full items-center justify-between rounded-lg border border-accent/35 bg-accent/5 px-3.5 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">Enter the 3D campus <span aria-hidden>↗</span></button>
          </div>
        </div>
        {current && <p className="mt-4 text-center font-mono text-xs text-muted">Currently: {current.role} at <span className="text-ink">{current.company}</span></p>}
      </Reveal>
    </section>
  );
}
