import type { SeriesCard } from "@snug/shared";

/** Where a Watching Series stands: Episodes out to catch up on, the Next Episode's air date, or no date yet. */
export type Airing = { kind: "ready"; left: number } | { kind: "dated"; date: string } | { kind: "tba" };

/** The viewer's calendar day as YYYY-MM-DD (air dates are plain days, compared in local time). */
const localDay = (now: Date) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

export function airing(card: Pick<SeriesCard, "next" | "airedCount" | "watchedCount">, now = new Date()): Airing {
  const date = card.next?.airDate;
  if (!date) return { kind: "tba" };
  if (date <= localDay(now)) return { kind: "ready", left: Math.max(1, card.airedCount - card.watchedCount) };
  return { kind: "dated", date };
}

const daysUntil = (date: string, now: Date) =>
  Math.round((new Date(`${date}T00:00:00`).getTime() - new Date(now.toDateString()).getTime()) / 86_400_000);

/** "Tomorrow", "In 3 days", "30 Oct"; "Date TBA" without a date. */
export function relativeDay(date: string | null | undefined, now = new Date()) {
  if (!date) return "Date TBA";
  const days = daysUntil(date, now);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** The same, short enough for a badge on a poster in a 4-column phone grid: "Tomorrow", "Thu", "30 Oct". */
export function shortDay(date: string, now = new Date()) {
  const days = daysUntil(date, now);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  const day = new Date(`${date}T00:00:00`);
  if (days < 7) return day.toLocaleDateString(undefined, { weekday: "short" });
  return day.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
