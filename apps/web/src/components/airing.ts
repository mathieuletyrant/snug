import type { SeriesCard } from "@snug/shared";
import type { Messages } from "@/i18n";

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

/**
 * New mode: the Next Episode aired in the last `days` days, after the last Watch, so you were caught up and
 * waiting for it. A Series being binged (last Watch after the air date) is not new.
 */
export function isNew(card: Pick<SeriesCard, "next" | "lastWatchedAt">, days: number, now = new Date()) {
  const date = card.next?.airDate;
  if (!date || !card.lastWatchedAt || date > localDay(now)) return false;
  if (daysUntil(date, now) < -days) return false;
  return localDay(new Date(card.lastWatchedAt)) <= date;
}

const daysUntil = (date: string, now: Date) =>
  Math.round((new Date(`${date}T00:00:00`).getTime() - new Date(now.toDateString()).getTime()) / 86_400_000);

/** How to say a day: the app's words for it, and its language for dates. */
export type DayWords = Pick<Messages, "tag" | "days" | "common">;

/** "Tomorrow", "In 3 days", "30 Oct"; "Date TBA" without a date. `lower` for after a word: "in 3 days". */
export function relativeDay(words: DayWords, date: string | null | undefined, now = new Date(), lower = false) {
  if (!date) return words.common.dateTba;
  const days = daysUntil(date, now);
  let text: string;
  if (days <= 0) text = words.days.today;
  else if (days === 1) text = words.days.tomorrow;
  else if (days < 7) text = words.days.inDays(days);
  else return new Date(`${date}T00:00:00`).toLocaleDateString(words.tag, { day: "numeric", month: "short" });
  return lower ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

/** The same, short enough for a badge on a poster in a 4-column phone grid: "Tomorrow", "Thu", "30 Oct". */
export function shortDay(words: DayWords, date: string, now = new Date()) {
  const days = daysUntil(date, now);
  if (days <= 0) return words.days.today;
  if (days === 1) return words.days.tomorrow;
  const day = new Date(`${date}T00:00:00`);
  if (days < 7) return day.toLocaleDateString(words.tag, { weekday: "short" });
  return day.toLocaleDateString(words.tag, { day: "numeric", month: "short" });
}

/** "Oct 7, 2025" or "7 oct. 2025". */
export const longDate = (tag: string, date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(tag, { dateStyle: "medium" });

/** "Dec 3" or "3 déc.". */
export const shortDate = (tag: string, date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(tag, { day: "numeric", month: "short" });
