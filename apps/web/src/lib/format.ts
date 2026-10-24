/** Small text helpers shared by the pages. */

export const greeting = (now = new Date()) => {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Cozy evening";
};

/** "In 3 days" → "in 3 days", "Tomorrow" → "tomorrow", to go after a word; a date like "3 Dec" stays as is. */
export const lowerFirst = (text: string) =>
  /^(In |Today|Tomorrow)/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text;

/** "just now", "5 min ago", "3 h ago", then the date and time. */
export function ago(iso: string, now = new Date()) {
  const minutes = Math.round((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)} h ago`;
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** "1 episode", "3 episodes". */
export const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
