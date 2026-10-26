import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** A titled group of Settings cards, e.g. which way the data goes: into Snug, or out of it. */
export function Group({
  icon: Icon,
  title,
  help,
  children,
}: {
  icon: LucideIcon;
  title: string;
  help: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 pt-4">
      <div className="flex items-center gap-3 border-b border-line/60 pb-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
          <Icon className="size-5" />
        </span>
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-sm text-muted">{help}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
