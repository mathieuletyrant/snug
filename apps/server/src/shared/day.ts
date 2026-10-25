/** Calendar days as YYYY-MM-DD, like TMDB air dates. */

/**
 * The instance's calendar day as YYYY-MM-DD, in its time zone (`TZ`): TMDB air dates are plain days, so this
 * one clock decides what has aired, everywhere.
 */
export const today = (now: Date = new Date()) => now.toLocaleDateString("en-CA");

/** A YYYY-MM-DD day moved by a number of days. */
export const addDays = (day: string, days: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
