import { useSyncExternalStore } from "react";

// Tailwind's `md` and `lg` breakpoints (default theme, not overridden in styles.css).
const MEDIUM = matchMedia("(min-width: 768px)");
const LARGE = matchMedia("(min-width: 1024px)");

function subscribe(onChange: () => void) {
  MEDIUM.addEventListener("change", onChange);
  LARGE.addEventListener("change", onChange);
  return () => {
    MEDIUM.removeEventListener("change", onChange);
    LARGE.removeEventListener("change", onChange);
  };
}

function columns() {
  if (LARGE.matches) return 4;
  if (MEDIUM.matches) return 3;
  return 2;
}

/** Columns of the Ready cards grid at the current width (`grid-cols-2 md:grid-cols-3 lg:grid-cols-4`). */
export function useColumns() {
  return useSyncExternalStore(subscribe, columns);
}
