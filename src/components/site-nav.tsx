"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Magnetic } from "@/components/fx/magnetic";

const links = [
  { href: "/about", label: "About" },
  { href: "/experience", label: "Experience" },
  { href: "/projects", label: "Projects" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
  { href: "/resume", label: "Resume" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="no-print sticky top-0 z-50 border-b border-line bg-bg/85 backdrop-blur">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-1 px-5 py-3"
      >
        <Magnetic>
          <Link
            href="/"
            className="font-display text-sm font-bold tracking-tight text-neon transition-colors hover:text-amber"
            title="Back to the world"
          >
            ▶ play
          </Link>
        </Magnetic>
        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {links.map((l) => {
            const active =
              pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`transition-colors ${
                  active
                    ? "font-medium text-neon"
                    : "text-muted hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
