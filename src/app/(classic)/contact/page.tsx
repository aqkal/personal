import type { Metadata } from "next";
import { profile, siteUi } from "@content";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${profile.name} - open to internships and graduate software engineering roles.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="max-w-2xl">
      <p className="microlabel font-mono text-accent">Contact</p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">
        Say hello<span className="text-accent">.</span>
      </h1>
      {profile.availability && (
        <p className="mt-3 text-muted">
          {profile.availability} Messages get answered, usually the same day.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <a
          className="link-underline text-accent"
          href={`mailto:${profile.email}`}
        >
          ✉ {profile.email}
        </a>
        <a
          className="link-underline text-accent"
          href={profile.socials.github}
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub ↗
        </a>
        <a
          className="link-underline text-accent"
          href={profile.socials.linkedin}
          target="_blank"
          rel="noopener noreferrer"
        >
          LinkedIn ↗
        </a>
      </div>

      <div className="mt-10 rounded-lg border border-line bg-surface p-6">
        <ContactForm
          email={profile.email}
          fallbackTitle={siteUi.contactFallbackTitle}
          fallbackDescription={siteUi.contactFallbackDescription}
        />
      </div>
    </div>
  );
}
