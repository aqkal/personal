"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { experience, profile } from "@content";
import { Reveal } from "@/components/fx/reveal";
import { ThemeToggle } from "@/components/theme-toggle";
import { AboutSection } from "./sections/about";
import { ContactSection } from "./sections/contact";
import { ExperienceSection } from "./sections/experience";
import { FooterSection } from "./sections/footer";
import { HeroSection } from "./sections/hero";
import { ProjectsSection } from "./sections/projects";
import { SkillsSection } from "./sections/skills";
import { WritingSection, type LatestPostMeta } from "./sections/writing";

export type { LatestPostMeta };

/**
 * Interface 2: the Spotlight One-Pager, art-directed as a "Campus Ticket".
 * One scroll, zero learning curve; deep pages share this design language.
 */

const SECTIONS = [
  { id: "about", label: "About" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "contact", label: "Contact" },
] as const;

// stable reference: a fresh array every render would tear down and rebuild
// the IntersectionObservers on each re-render
const SECTION_IDS = SECTIONS.map((s) => s.id);

function useScrollSpy(ids: readonly string[]): string {
  const [active, setActive] = useState("");
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      let next = "";
      for (const id of ids) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= window.innerHeight * 0.38) next = id;
      }
      setActive((old) => old === next ? old : next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, [ids]);
  return active;
}

function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      el.style.transform = `scaleX(${max > 0 ? doc.scrollTop / max : 0})`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden
      className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-accent"
      style={{ transform: "scaleX(0)" }}
    />
  );
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
  const active = useScrollSpy(SECTION_IDS);
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!SECTION_IDS.includes(id as typeof SECTION_IDS[number])) return;
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "instant" }));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:border focus:border-line focus:bg-surface focus:px-4 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <ScrollProgress />

      <header className="portfolio-nav no-print">
        <div className="portfolio-nav-inner">
          <a href="#top" className="portfolio-wordmark flex items-center text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50" aria-label="Back to top">{profile.name}<span className="text-accent">.</span></a>
          <nav aria-label="Portfolio sections" className="hidden items-center gap-0.5 rounded-full border border-line bg-surface/80 p-1 shadow-sm backdrop-blur lg:flex">
            {SECTIONS.map((section) => <a key={section.id} href={"#" + section.id} aria-current={active === section.id ? "location" : undefined} className={"flex min-h-9 items-center rounded-full px-3.5 text-sm transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 " + (active === section.id ? "bg-accent/10 text-accent shadow-sm" : "text-muted hover:bg-raised hover:text-ink")}>{section.label}</a>)}
          </nav>
          <div className="flex items-center gap-1.5">
            <Link href="/resume" className="hidden min-h-10 items-center rounded-full px-3 text-sm text-muted transition-colors hover:bg-raised hover:text-ink sm:flex">Résumé ↗</Link>
            <button type="button" onClick={onPlayGame} className="flex min-h-10 items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-3.5 text-sm font-medium text-accent transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"><span aria-hidden>◈</span> 3D campus</button>
            <ThemeToggle className="border-transparent" />
            <button type="button" onClick={onExit} aria-label="Choose portfolio experience" title="Choose experience" className="flex size-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">↩</button>
          </div>
        </div>
        <nav aria-label="Mobile portfolio sections" className="mx-auto mt-2 flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-full border border-line bg-bg/95 p-1 backdrop-blur lg:hidden">
          {SECTIONS.map((section) => <a key={section.id} href={"#" + section.id} aria-current={active === section.id ? "location" : undefined} className={"flex min-h-9 items-center rounded-full px-2.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 " + (active === section.id ? "bg-accent/10 text-accent" : "text-muted hover:text-ink")}>{section.label}</a>)}
        </nav>
      </header>

      <main id="main" className="mx-auto max-w-[1120px] px-5 sm:px-8">
        <HeroSection onPlayGame={onPlayGame} />

        <Reveal>
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-y border-line py-6">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted">Where I have worked</p>
            {experience.map((job) => <a href="#experience" key={job.id} className="font-display text-lg font-semibold text-ink/75 transition-colors hover:text-accent">{job.company}<span className="ml-2 text-xs text-muted" aria-hidden>↗</span></a>)}
          </div>
        </Reveal>

        <AboutSection />
        <ExperienceSection />
        <ProjectsSection />
        <SkillsSection />
        {latestPost && <WritingSection post={latestPost} />}
        <ContactSection />
      </main>

      <FooterSection onPlayGame={onPlayGame} />
    </div>
  );
}
