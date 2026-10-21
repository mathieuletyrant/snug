import { House, Library, Search, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ImportBanner } from "./import-progress";
import { cx } from "./ui";

const TABS = [
  { href: "/", label: "Home", icon: House },
  { href: "/library", label: "Library", icon: Library },
  { href: "/search", label: "Search", icon: Search },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Top bar on desktop, bottom tab bar on mobile. */
export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const active = (href: string) => (href === "/" ? location === "/" : location.startsWith(href));

  return (
    <div className="pt-safe min-h-dvh">
      <header className="sticky top-0 z-40 hidden border-b border-line/60 bg-bg/85 backdrop-blur-lg md:block">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-8 px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/icon.svg" alt="" className="size-8 rounded-lg" />
            <span className="font-display text-2xl font-semibold text-accent">snug</span>
          </Link>
          <nav className="ml-auto flex gap-1">
            {TABS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cx(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition",
                  active(href) ? "bg-raised text-accent" : "text-muted hover:text-text",
                )}
              >
                <Icon className="size-4" /> {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-6 pb-28 md:px-6 md:pt-10 md:pb-12">
        <ImportBanner />
        <div key={location} className="animate-page-in">
          {children}
        </div>
      </main>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-bg/90 backdrop-blur-lg md:hidden">
        {/* Content fades out before it slides under the bar. */}
        <div className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-bg/80 to-transparent" />
        <div className="mx-auto flex max-w-md justify-around pt-2">
          {TABS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cx(
                "flex min-w-16 flex-col items-center gap-0.5 px-3 py-1 text-xs font-bold transition",
                active(href) ? "text-accent" : "text-muted",
              )}
            >
              <Icon className="size-6" strokeWidth={active(href) ? 2.4 : 1.8} />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
