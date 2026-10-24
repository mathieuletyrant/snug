import { Tv } from "lucide-react";
import { useState } from "react";
import { backdropSrcSet, image, posterSrcSet } from "../../api";
import { cx } from "./cx";

/** Poster grid shared by Home (Upcoming), Library and Search: 4 per row on phones, 8 on desktop. */
export const POSTER_GRID = "grid grid-cols-4 gap-x-2.5 gap-y-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 lg:gap-x-4";
/** Rendered poster width in POSTER_GRID, for `srcset`. */
const POSTER_GRID_SIZES = "(min-width: 1024px) 115px, (min-width: 768px) 16vw, (min-width: 640px) 20vw, 25vw";

/** Fades an image in once loaded; cached images can finish loading before React attaches onLoad. */
function useLoaded() {
  const [loaded, setLoaded] = useState(false);
  return {
    loaded,
    imgProps: {
      ref: (img: HTMLImageElement | null) => {
        if (img?.complete) setLoaded(true);
      },
      onLoad: () => setLoaded(true),
    },
  };
}

/**
 * `sizes` is the rendered width, so the browser picks the smallest poster that stays sharp
 * (e.g. a 64px thumbnail loads w154 on a 2x screen instead of w342).
 */
export function Poster({
  path,
  name,
  className,
  sizes = POSTER_GRID_SIZES,
  eager = false,
}: {
  path: string | null;
  name: string;
  className?: string;
  sizes?: string;
  eager?: boolean;
}) {
  const { loaded, imgProps } = useLoaded();
  return (
    <div
      className={cx(
        "aspect-[2/3] shrink-0 overflow-hidden rounded-2xl bg-raised shadow-md shadow-black/30",
        path && !loaded && "animate-pulse",
        className,
      )}
    >
      {path ? (
        <img
          src={image(path, "w342") ?? undefined}
          srcSet={posterSrcSet(path)}
          sizes={sizes}
          alt={name}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          {...imgProps}
          className={cx("h-full w-full object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted">
          <Tv className="size-1/3" />
        </div>
      )}
    </div>
  );
}

/** Landscape image with the same fade-in as Poster; falls back to the poster, cropped. */
export function Backdrop({
  backdropPath,
  posterPath,
  sizes,
  className,
}: {
  backdropPath: string | null;
  posterPath: string | null;
  sizes: string;
  className?: string;
}) {
  const { loaded, imgProps } = useLoaded();
  const path = backdropPath ?? posterPath;
  if (!path) return <div className={cx("bg-raised", className)} />;
  return (
    <div className={cx("bg-raised", !loaded && "animate-pulse", className)}>
      <img
        src={image(path, backdropPath ? "w780" : "w342") ?? undefined}
        srcSet={backdropPath ? backdropSrcSet(path) : posterSrcSet(path)}
        sizes={sizes}
        alt=""
        decoding="async"
        {...imgProps}
        className={cx(
          "h-full w-full object-cover transition-opacity duration-300",
          !backdropPath && "object-[50%_20%]",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}

export function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  return (
    <div className={cx("h-1.5 overflow-hidden rounded-full bg-raised", className)}>
      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
    </div>
  );
}
