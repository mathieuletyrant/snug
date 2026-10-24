import { isTitleHidden } from "@snug/shared";
import { useState } from "react";
import { usePreferences } from "./preferences";
import { cx } from "./ui";

/** An Episode's title, blurred by the spoiler shield until tapped. */
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
      className={cx("inline-block max-w-full cursor-pointer truncate align-bottom blur-[5px] select-none", className)}
    >
      {name}
    </button>
  );
}
