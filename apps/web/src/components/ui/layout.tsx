import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "@/i18n";
import { cx } from "./cx";

/** Radix popups keep this far from the screen's edges; at the bottom, clear of the phone's tab bar. */
export const COLLISION_PADDING = { top: 12, right: 12, bottom: 96, left: 12 };

/** Floating menu (Radix DropdownMenu content) and its items. */
export const MENU =
  "z-50 min-w-44 overflow-hidden rounded-2xl border border-line bg-raised p-1 shadow-2xl shadow-black/50 origin-(--radix-dropdown-menu-content-transform-origin) data-[state=open]:animate-pop-in";
export const MENU_ITEM =
  "flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none select-none data-highlighted:bg-line data-[state=checked]:text-accent data-disabled:cursor-not-allowed data-disabled:opacity-40";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-3xl border border-line/60 bg-surface p-5", className)}>{children}</div>;
}

/** Rows in one rounded list under a small title, as in iOS Settings. */
export function ListGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section>
      {title && <h2 className="mb-2 px-1 font-sans text-xs font-bold tracking-wider text-muted uppercase">{title}</h2>}
      <ul className="divide-y divide-line/60 overflow-hidden rounded-3xl border border-line/60 bg-surface">{children}</ul>
    </section>
  );
}

/** A card's title, and what the card is for. */
export function CardHeader({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className={children ? "mb-4" : "mb-2"}>
      <h2 className="text-xl">{title}</h2>
      {children && <p className="mt-1 text-sm text-muted">{children}</p>}
    </div>
  );
}

export function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <h1 className="text-3xl font-semibold">{children}</h1>
      {action}
    </div>
  );
}

/** A section's title with its count: "Ready to watch 6". */
export function SectionTitle({ children, count }: { children: ReactNode; count: number }) {
  return (
    <h2 className="mb-3 flex items-baseline gap-2 text-xl">
      {children} <span className="font-sans text-sm font-bold text-muted">{count}</span>
    </h2>
  );
}

export function BackButton() {
  const t = useT();
  return (
    <button onClick={() => history.back()} aria-label={t.common.back} className="rounded-full bg-bg/80 p-2">
      <ArrowLeft className="size-5" />
    </button>
  );
}

/** The pages outside the app's tabs (sign in, setup): one narrow column in the middle of the screen. */
export function CenteredPage({
  icon,
  title,
  intro,
  wide = false,
  children,
}: {
  icon: ReactNode;
  title: string;
  intro?: ReactNode;
  wide?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={cx("mx-auto flex min-h-dvh flex-col justify-center px-4 py-10", wide ? "max-w-md" : "max-w-sm")}>
      <div className="mb-6">{icon}</div>
      <h1 className="mb-2 text-3xl font-semibold">{title}</h1>
      {intro && <p className="mb-6 text-muted">{intro}</p>}
      {children}
    </div>
  );
}
