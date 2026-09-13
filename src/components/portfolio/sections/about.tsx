"use client";

import { education, experience, profile } from "@content";
import { Reveal } from "@/components/fx/reveal";
import { SectionHeading } from "../ticket";

export function AboutSection() {
  const currentJob = experience.find((e) => e.end === null);

  return (
    <section id="about" className="portfolio-section scroll-mt-28">
      <div className="grid gap-10 md:grid-cols-[200px_1fr]">
        <SectionHeading index="01 / PROFILE" title="About" sticky />
        <Reveal>
          <p className="max-w-2xl text-pretty text-xl leading-relaxed text-ink">
            I care about software that is engineered properly and feels great
            to use. That is why this portfolio is a walkable 3D campus and the
            page you are reading, rendered from the same typed content model.
          </p>
          <p className="mt-5 max-w-2xl leading-relaxed text-muted">
            Currently, {currentJob ? <>I am a {currentJob.role.toLowerCase()} at {currentJob.company}{currentJob.blurb ? `, ${currentJob.blurb}` : ""}.</> : <>I am studying {education[0].degree.split(":").pop()?.trim().toLowerCase()} at UQ.</>} At university I
            have led coursework from computer vision for ship hulls to a
            microservices platform deployed with Terraform.
          </p>
          <ul className="mt-8 flex max-w-2xl flex-wrap gap-2.5">
            {profile.funFacts.map((fact) => (
              <li
                key={fact}
                className="inline-flex items-center gap-2.5 rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent/50 hover:text-ink"
              >
                <span
                  aria-hidden
                  className="size-2 rounded-full border border-muted/60"
                />
                {fact}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
