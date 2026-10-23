import { ChevronDown, CircleAlert, Tv } from "lucide-react";
import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  useId,
  useState,
} from "react";
import { ToggleGroup } from "radix-ui";
import { backdropSrcSet, image, posterSrcSet } from "../api";

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

/** Poster grid shared by Home (Upcoming), Library and Search: 4 per row on phones, 8 on desktop. */
export const POSTER_GRID = "grid grid-cols-4 gap-x-2.5 gap-y-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 lg:gap-x-4";
/** Rendered poster width in POSTER_GRID, for `srcset`. */
const POSTER_GRID_SIZES = "(min-width: 1024px) 115px, (min-width: 768px) 16vw, (min-width: 640px) 20vw, 25vw";

/** Radix popups keep this far from the screen's edges; at the bottom, clear of the phone's tab bar. */
export const COLLISION_PADDING = { top: 12, right: 12, bottom: 96, left: 12 };

/** Floating menu (Radix DropdownMenu content) and its items. */
export const MENU =
  "z-50 min-w-44 overflow-hidden rounded-2xl border border-line bg-raised p-1 shadow-2xl shadow-black/50 origin-(--radix-dropdown-menu-content-transform-origin) data-[state=open]:animate-pop-in";
export const MENU_ITEM =
  "flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none select-none data-highlighted:bg-line data-[state=checked]:text-accent";

/**
 * One choice among a few, as pills (Radix ToggleGroup: arrow keys move between them). Clicking the
 * active pill keeps it on rather than leaving nothing chosen.
 */
export function Chips({
  label,
  value,
  onChange,
  options,
  small = false,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: ReactNode }[];
  small?: boolean;
  className?: string;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      aria-label={label}
      value={value}
      onValueChange={(v) => v && onChange(v)}
      className={cx("no-scrollbar flex gap-1.5 overflow-x-auto", className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          className={cx(
            "shrink-0 rounded-full font-bold text-muted transition hover:text-text data-[state=on]:bg-accent data-[state=on]:text-accent-ink",
            small ? "bg-raised px-3 py-1.5 text-xs" : "bg-raised px-4 py-2 text-sm",
          )}
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition active:scale-[0.97] disabled:opacity-50",
        variant === "primary" && "bg-accent text-accent-ink hover:bg-accent-strong",
        variant === "ghost" && "bg-raised text-text hover:bg-line",
        variant === "danger" && "bg-rose/15 text-rose hover:bg-rose/25",
        className,
      )}
      {...props}
    />
  );
}

export function Input({
  label,
  error,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-muted">
        {label}
      </label>
      <input
        id={id}
        data-label={label}
        aria-invalid={!!error}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        className={cx(
          "w-full rounded-2xl border bg-surface px-4 py-3 text-text placeholder:text-muted/60 focus:outline-none",
          error ? "border-rose focus:border-rose" : "border-line focus:border-accent",
        )}
        {...props}
      />
      {(error || hint) && (
        <p id={`${id}-msg`} className={cx("mt-1.5 flex items-center gap-1.5 text-sm", error ? "text-rose" : "text-muted")}>
          {error && <CircleAlert className="size-4 shrink-0" />}
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

/** Native <select> (keyboard and mobile pickers for free) styled like Input. */
export function Select({
  label,
  hint,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-muted">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="w-full cursor-pointer appearance-none rounded-2xl border border-line bg-surface py-3 pr-11 pl-4 text-text transition hover:border-muted/40 focus:border-accent focus:outline-none disabled:cursor-wait disabled:opacity-60"
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-muted" />
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-3xl border border-line/60 bg-surface p-5", className)}>{children}</div>;
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
  const [loaded, setLoaded] = useState(false);
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
          // Cached images can finish loading before React attaches onLoad.
          ref={(img) => {
            if (img?.complete) setLoaded(true);
          }}
          onLoad={() => setLoaded(true)}
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
  const [loaded, setLoaded] = useState(false);
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
        ref={(img) => {
          if (img?.complete) setLoaded(true);
        }}
        onLoad={() => setLoaded(true)}
        className={cx(
          "h-full w-full object-cover transition-opacity duration-300",
          !backdropPath && "object-[50%_20%]",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-raised">
      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
    </div>
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

export function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <h1 className="text-3xl font-semibold">{children}</h1>
      {action}
    </div>
  );
}

export { cx };
