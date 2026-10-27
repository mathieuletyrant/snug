import { atHourIn, today } from "@/shared/day";

/**
 * Roughly when a Series' Episodes come out on their TMDB date, a day in the country of origin with no time: close
 * enough to tell the Day they air in the instance's time zone (see ADR 0005). Platforms first, then prime time
 * in the country of origin.
 * ponytail: guessed release hours; add a line when a Series lands on the wrong Day.
 */
export interface Release {
  timeZone: string;
  hour: number;
}

const BY_NETWORK: Record<string, Release> = {
  Netflix: { timeZone: "America/Los_Angeles", hour: 0 },
  "Paramount+": { timeZone: "America/Los_Angeles", hour: 0 },
  Peacock: { timeZone: "America/Los_Angeles", hour: 0 },
  "Prime Video": { timeZone: "UTC", hour: 0 },
  "Apple TV+": { timeZone: "America/New_York", hour: 0 },
  "Apple TV": { timeZone: "America/New_York", hour: 0 },
  "Disney+": { timeZone: "America/Los_Angeles", hour: 18 },
};

const PRIME_TIME = 21;
const BY_COUNTRY: Record<string, string> = {
  US: "America/New_York",
  CA: "America/Toronto",
  GB: "Europe/London",
  JP: "Asia/Tokyo",
  KR: "Asia/Seoul",
};

/** How a Series is released, from its TMDB networks and countries of origin; null when neither is known. */
export function releaseOf(networks: readonly string[], countries: readonly string[]): Release | null {
  for (const network of networks) if (BY_NETWORK[network]) return BY_NETWORK[network];
  for (const country of countries) if (BY_COUNTRY[country]) return { timeZone: BY_COUNTRY[country], hour: PRIME_TIME };
  return null;
}

/** The Air date of an Episode TMDB dates `date`: the Day of its release here, TMDB's day when the release is unknown. */
export const airDateHere = (date: string, release: Release | null) =>
  release ? today(atHourIn(date, release.hour, release.timeZone)) : date;
