import { expect, test } from "bun:test";
import { ago, greeting, lowerFirst, plural } from "./format";

test("greeting follows the hour", () => {
  expect(greeting(new Date(2026, 9, 24, 8))).toBe("Good morning");
  expect(greeting(new Date(2026, 9, 24, 14))).toBe("Good afternoon");
  expect(greeting(new Date(2026, 9, 24, 21))).toBe("Cozy evening");
});

test("lowerFirst only lowers relative days", () => {
  expect(lowerFirst("In 3 days")).toBe("in 3 days");
  expect(lowerFirst("Tomorrow")).toBe("tomorrow");
  expect(lowerFirst("Dec 3")).toBe("Dec 3");
});

test("ago counts minutes, then hours", () => {
  const now = new Date("2026-10-24T12:00:00Z");
  expect(ago("2026-10-24T11:59:40Z", now)).toBe("just now");
  expect(ago("2026-10-24T11:55:00Z", now)).toBe("5 min ago");
  expect(ago("2026-10-24T09:00:00Z", now)).toBe("3 h ago");
});

test("plural", () => {
  expect(plural(1, "episode")).toBe("1 episode");
  expect(plural(3, "episode")).toBe("3 episodes");
  expect(plural(2, "series", "series")).toBe("2 series");
});
