import Link from "next/link";
import { profile } from "@content";

export function SiteFooter() {
  return (
    <footer className="no-print mt-20 border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted">
        <p>
          © {new Date().getFullYear()} {profile.name} · Built with Next.js +
          Phaser
        </p>
        <div className="flex gap-4">
          <a
            href={profile.socials.github}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-neon"
          >
            GitHub
          </a>
          <a
            href={profile.socials.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-cyan"
          >
            LinkedIn
          </a>
          <Link href="/" className="transition-colors hover:text-amber">
            ▶ Enter the world
          </Link>
        </div>
      </div>
    </footer>
  );
}
