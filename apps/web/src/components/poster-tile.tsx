import type { ReactNode } from "react";
import { Link } from "wouter";
import { Poster, Skeleton } from "./ui";

/** A series in a poster grid (Upcoming, Library, Search): poster, name, then a line or two about it. */
export function PosterTile({
  href,
  posterPath,
  name,
  overlay,
  children,
}: {
  href: string;
  posterPath: string | null;
  name: string;
  /** Drawn over the poster, e.g. a badge. */
  overlay?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Link href={href} className="group block space-y-1.5">
      <div className="relative transition group-hover:-translate-y-0.5">
        <Poster path={posterPath} name={name} className="w-full" />
        {overlay}
      </div>
      <p className="truncate text-xs font-semibold sm:text-sm">{name}</p>
      {children}
    </Link>
  );
}

/** A small line under a tile's name. */
export function TileLine({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={`text-[11px] leading-tight sm:text-xs ${className ?? "text-muted"}`}>{children}</p>;
}

/** A tile while its series loads. */
export function PosterTileSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="aspect-[2/3] w-full" />
      <Skeleton className="h-3.5 w-3/4 rounded-full" />
    </div>
  );
}
