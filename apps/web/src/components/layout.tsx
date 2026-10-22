import { House, Library, Search, Settings } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { queryClient } from "../api";
import { homeQuery, libraryQuery } from "../queries";
import { ImportBanner } from "./import-progress";
import { cx } from "./ui";

const TABS = [
  { href: "/", label: "Home", icon: House },
  { href: "/library", label: "Library", icon: Library },
  { href: "/search", label: "Search", icon: Search },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Starts loading a tab's data while the finger is still down (no-op when it is fresh in the cache). */
const prefetch = (href: string) => {
  if (href === "/") queryClient.prefetchQuery(homeQuery);
  if (href === "/library") queryClient.prefetchQuery(libraryQuery);
};

/** Top bar on desktop, bottom tab bar on mobile. */
export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const active = (href: string) => (href === "/" ? location === "/" : location.startsWith(href));
  // The tab under the finger, lit before the page changes; cleared once it has.
  const [pressed, setPressed] = useState<string | null>(null);
  useEffect(() => setPressed(null), [location]);
  // A finger that slid off the tab never clicks it: unlight it.
  useEffect(() => {
    if (!pressed) return;
    const timer = setTimeout(() => setPressed(null), 800);
    return () => clearTimeout(timer);
  }, [pressed]);

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
        <div className="mx-auto flex max-w-md">
          {TABS.map(({ href, label, icon: Icon }) => {
            const on = pressed ? pressed === href : active(href);
            return (
              <Link
                key={href}
                href={href}
                // React on touch, not on release: the tab lights up and its data starts loading right away.
                onPointerDown={() => {
                  setPressed(href);
                  prefetch(href);
                }}
                onPointerCancel={() => setPressed(null)}
                className={cx(
                  "group flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1 text-[11px] font-bold transition-colors duration-75",
                  on ? "text-accent" : "text-muted",
                )}
              >
                <Icon className="size-6 transition-transform duration-75 group-active:scale-90" strokeWidth={on ? 2.4 : 1.8} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
