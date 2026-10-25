import { expect, test } from "bun:test";
import { en } from "@/i18n/en";
import { fr } from "@/i18n/fr";
import { relativeDay, shortDay } from "./airing";

const now = new Date(2026, 9, 22, 21, 30); // Thu 22 Oct 2026, evening

test("badge dates stay short, in the app's language", () => {
  expect(shortDay(en, "2026-10-22", now)).toBe("Today");
  expect(shortDay(fr, "2026-10-23", now)).toBe("Demain");
  expect(shortDay(en, "2026-10-26", now)).toBe("Mon");
  expect(shortDay(fr, "2026-11-30", now)).toBe("30 nov.");
});

test("relative days, and lowered to follow a word", () => {
  expect(relativeDay(en, "2026-10-25", now)).toBe("In 3 days");
  expect(relativeDay(fr, "2026-10-25", now, true)).toBe("dans 3 jours");
  expect(relativeDay(en, "2026-12-03", now, true)).toBe("Dec 3");
  expect(relativeDay(fr, null, now)).toBe("Date à venir");
});

test("durations, in the app's language", () => {
  expect(en.common.duration(45)).toBe("45m");
  expect(en.common.duration(120)).toBe("2h");
  expect(fr.common.duration(485)).toBe("8 h 05");
  expect(fr.common.left(fr.common.duration(45))).toBe("encore 45 min");
});
