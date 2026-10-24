import { isTitleHidden } from "@snug/shared";
import { useState } from "react";
import { usePreferences } from "./preferences";
import { cx } from "./ui";

/**
 * An Episode's title, or a soft bar in its place while the spoiler shield hides it. The title itself isn't
 * on the page until tapped: a blurred text can still be read, and a truncated line cuts the blur square.
 */
export function EpisodeTitle({
  name,
  watched,
  next,
  className,
}: {
  name: string;
  watched: boolean;
  next: boolean;
  className?: string;
}) {
  const preferences = usePreferences();
  const [revealed, setRevealed] = useState(false);
  if (revealed || !isTitleHidden(preferences, { watched, next })) return <span className={className}>{name}</span>;
  return (
    <button
      type="button"
      onClick={(e) => {
        // Inside a link (Ready cards): reveal, don't open the series.
        e.preventDefault();
        e.stopPropagation();
        setRevealed(true);
      }}
      aria-label="Hidden title, tap to show"
      className={cx("inline-flex max-w-full cursor-pointer items-center align-middle", className)}
    >
      <span
        aria-hidden
        // About as long as the title, within reason: the bar hints at it without giving it away.
        style={{ width: `${Math.min(24, Math.max(6, name.length * 0.55))}ch` }}
        className="h-[0.8em] max-w-full rounded-full bg-gradient-to-r from-text/25 via-text/15 to-text/25 transition hover:from-text/35 hover:to-text/35"
      />
    </button>
  );
}
