/** Small text helpers shared by the pages, in the app's language. */
import type { Messages } from "../i18n";

export function greeting(t: Messages, now = new Date()) {
  const h = now.getHours();
  if (h < 12) return t.home.greeting.morning;
  if (h < 18) return t.home.greeting.afternoon;
  return t.home.greeting.evening;
}

/** "just now", "5 min ago", "3 h ago", then the date and time. */
export function ago(t: Messages, iso: string, now = new Date()) {
  const minutes = Math.round((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return t.ago.justNow;
  if (minutes < 60) return t.ago.minutes(minutes);
  if (minutes < 24 * 60) return t.ago.hours(Math.round(minutes / 60));
  return new Date(iso).toLocaleString(t.tag, { dateStyle: "medium", timeStyle: "short" });
}
