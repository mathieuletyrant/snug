import { afterEach, expect, test } from "bun:test";
import { airDateHere, releaseOf } from "./air-date";

const zone = process.env.TZ;
afterEach(() => {
  if (zone === undefined) delete process.env.TZ;
  else process.env.TZ = zone;
});

test("in Paris, a US evening release is the next Day, a Netflix one the same Day", () => {
  process.env.TZ = "Europe/Paris";
  // VisionQuest S01E05: the 27th on TMDB, out at 02:54 on the 28th in Paris.
  expect(airDateHere("2026-10-27", releaseOf(["Disney+"], ["US"]))).toBe("2026-10-28");
  expect(airDateHere("2026-10-27", releaseOf(["ABC"], ["US"]))).toBe("2026-10-28");
  expect(airDateHere("2026-07-14", releaseOf(["HBO"], ["US"]))).toBe("2026-07-15");
  expect(airDateHere("2026-10-27", releaseOf(["Netflix"], ["US"]))).toBe("2026-10-27");
  expect(airDateHere("2026-10-27", releaseOf(["Apple TV+"], ["US"]))).toBe("2026-10-27");
  expect(airDateHere("2026-10-27", releaseOf(["BBC One"], ["GB"]))).toBe("2026-10-27");
});

test("an instance in the country of origin keeps TMDB's day, and so does an unknown release", () => {
  process.env.TZ = "America/New_York";
  expect(airDateHere("2026-10-27", releaseOf(["Disney+"], ["US"]))).toBe("2026-10-27");
  expect(airDateHere("2026-10-27", releaseOf(["ABC"], ["US"]))).toBe("2026-10-27");
  process.env.TZ = "Europe/Paris";
  expect(releaseOf(["Canal+"], ["FR"])).toBeNull();
  expect(airDateHere("2026-10-27", null)).toBe("2026-10-27");
});
