"use client";

import { technicalSkills } from "@content";
import { Reveal } from "@/components/fx/reveal";
import { SectionHeading } from "../ticket";

export function SkillsSection() {
  return (
    <section id="skills" className="portfolio-section scroll-mt-28 border-t border-line">
      <div className="grid gap-10 md:grid-cols-[200px_1fr]">
        <SectionHeading index="04 / TOOLKIT" title="Skills" sticky />
        <Reveal>
          <ul className="flex flex-wrap gap-2">
            {technicalSkills.map((skill) => <li key={skill} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-muted transition-[border-color,color,transform] duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:text-ink">{skill}</li>)}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
