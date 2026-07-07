import type { Metadata } from "next";
import { profile } from "@content";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${profile.name} - open to internships and graduate software engineering roles.`,
};

export default function ContactPage() {
  return (
    <div className="max-w-2xl">
      <p className="font-pixel text-[10px] text-neon">POST OFFICE</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight">Contact</h1>
      {profile.availability && (
        <p className="mt-3 text-muted">{profile.availability}</p>
      )}

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <a
          className="text-cyan transition-colors hover:text-neon"
          href={`mailto:${profile.email}`}
        >
          ✉ {profile.email}
        </a>
        <a
          className="text-cyan transition-colors hover:text-neon"
          href={profile.socials.github}
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub ↗
        </a>
        <a
          className="text-cyan transition-colors hover:text-neon"
          href={profile.socials.linkedin}
          target="_blank"
          rel="noopener noreferrer"
        >
          LinkedIn ↗
        </a>
      </div>

      <div className="mt-10 rounded-lg border border-line bg-surface p-6">
        <ContactForm />
      </div>
    </div>
  );
}
