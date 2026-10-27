/** Calendar days as YYYY-MM-DD, like TMDB air dates. */

/**
 * The instance's calendar day as YYYY-MM-DD, in its time zone (`TZ`): TMDB air dates are plain days, so this
 * one clock decides what has aired, everywhere.
 */
export const today = (now: Date = new Date()) => now.toLocaleDateString("en-CA");

/** The start of a YYYY-MM-DD day in the instance's time zone, so `today()` reads the same day back. */
export const startOf = (day: string) => new Date(`${day}T00:00:00`);

/** A YYYY-MM-DD day moved by a number of days. */
export const addDays = (day: string, days: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** The instance's time zone (`TZ`), e.g. "Europe/Paris", for the app to count days the same way. */
export const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** The moment a YYYY-MM-DD day reaches `hour` o'clock in another time zone, e.g. 18:00 in "America/Los_Angeles". */
export function atHourIn(day: string, hour: number, timeZone: string) {
  const guess = Date.parse(`${day}T${String(hour).padStart(2, "0")}:00:00Z`);
  const wallClock = Date.parse(`${new Date(guess).toLocaleString("sv-SE", { timeZone }).replace(" ", "T")}Z`);
  return new Date(2 * guess - wallClock);
}
