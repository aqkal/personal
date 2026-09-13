import Link from "next/link";
import { profile } from "@content";

export function SiteFooter() {
  return (
    <footer className="no-print mt-20 border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-5 py-7 font-mono text-[11px] text-muted">
        <p>
          © {new Date().getFullYear()} {profile.name} · Built with Next.js +
          three.js
        </p>
        <div className="flex items-center gap-5">
          <a
            href={profile.socials.github}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-accent"
          >
            GitHub
          </a>
          <a
            href={profile.socials.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-accent"
          >
            LinkedIn
          </a>
          <Link
            href="/?view=game"
            className="microlabel link-underline text-accent transition-colors"
          >
            Enter the 3D campus →
          </Link>
        </div>
      </div>
    </footer>
  );
}
