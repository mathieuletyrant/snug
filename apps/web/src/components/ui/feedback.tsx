import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "./cx";

/** A small pill: "New", "4 left", "Admin". */
export function Badge({ tone = "muted", children }: { tone?: "accent" | "muted" | "plain"; children: ReactNode }) {
  return (
    <span
      className={cx(
        "shrink-0 rounded-full px-2 py-0.5 font-sans text-[11px] font-bold",
        tone === "accent" && "bg-accent text-accent-ink",
        tone === "muted" && "bg-bg/85 text-muted",
        tone === "plain" && "bg-raised text-muted",
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-2xl bg-raised", className)} />;
}

export function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="size-8 animate-spin rounded-full border-3 border-raised border-t-accent" />
    </div>
  );
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="text-accent">{icon}</div>
      <h3 className="text-xl">{title}</h3>
      {children && <div className="max-w-sm text-sm text-muted">{children}</div>}
    </div>
  );
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p role="alert" className="flex items-center gap-1.5 rounded-2xl bg-rose/10 px-4 py-3 text-sm text-rose">
      <CircleAlert className="size-4 shrink-0" />
      {error instanceof Error ? error.message : String(error)}
    </p>
  );
}
