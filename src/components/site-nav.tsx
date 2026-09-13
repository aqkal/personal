"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { setStoredInterface } from "@/lib/interface-mode";

const links = [
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
  { href: "/resume", label: "Resume" },
];

/** Chrome for the portfolio's deep pages (case studies, blog, resume). */
export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="no-print sticky top-0 z-50 px-3 pt-3">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-1 rounded-full border border-line bg-bg/90 px-5 py-2 shadow-sm backdrop-blur"
      >
        <Link
          href="/?view=portfolio"
          onClick={() => setStoredInterface("portfolio")}
          className="font-display text-sm font-bold tracking-tight text-accent transition-colors"
        >
          ← Portfolio
        </Link>
        <div className="ml-auto flex flex-wrap items-center gap-1 text-sm">
          {links.map((l) => {
            const active =
              pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                  active
                    ? "bg-accent/10 font-medium text-accent"
                    : "text-muted hover:bg-raised hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <Link
            href="/?view=game"
            onClick={() => setStoredInterface("game")}
            className="btn-fx microlabel rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 font-mono text-accent"
          >
            ▶ 3D campus
          </Link>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
