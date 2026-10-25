import type { Messages } from "@/i18n";

/**
 * Today as YYYY-MM-DD in the instance's time zone (`SetupState.timeZone`): the server decides what has aired
 * in it, so "Today" and "Tomorrow" must count days the same way, wherever the browser is.
 */
export const dayIn = (timeZone: string | undefined, now = new Date()) => now.toLocaleDateString("en-CA", { timeZone });

const daysUntil = (date: string, today: string) => Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000);

/** How to say a day: the app's words for it, and its language for dates. */
export type DayWords = Pick<Messages, "tag" | "days" | "common">;

/** "Tomorrow", "In 3 days", "30 Oct"; "Date TBA" without a date. `lower` for after a word: "in 3 days". */
export function relativeDay(words: DayWords, date: string | null | undefined, today: string, lower = false) {
  if (!date) return words.common.dateTba;
  const days = daysUntil(date, today);
  let text: string;
  if (days <= 0) text = words.days.today;
  else if (days === 1) text = words.days.tomorrow;
  else if (days < 7) text = words.days.inDays(days);
  else return new Date(`${date}T00:00:00`).toLocaleDateString(words.tag, { day: "numeric", month: "short" });
  return lower ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

/** The same, short enough for a badge on a poster in a 4-column phone grid: "Tomorrow", "Thu", "30 Oct". */
export function shortDay(words: DayWords, date: string, today: string) {
  const days = daysUntil(date, today);
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
