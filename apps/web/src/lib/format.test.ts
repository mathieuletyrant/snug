import { expect, test } from "bun:test";
import { en } from "../i18n/en";
import { fr } from "../i18n/fr";
import { ago, greeting } from "./format";

test("greeting follows the hour, in the app's language", () => {
  expect(greeting(en, new Date(2026, 9, 24, 8))).toBe("Good morning");
  expect(greeting(en, new Date(2026, 9, 24, 14))).toBe("Good afternoon");
  expect(greeting(fr, new Date(2026, 9, 24, 21))).toBe("Bonne soirée");
});

test("ago counts minutes, then hours", () => {
  const now = new Date("2026-10-24T12:00:00Z");
  expect(ago(en, "2026-10-24T11:59:40Z", now)).toBe("just now");
  expect(ago(en, "2026-10-24T11:55:00Z", now)).toBe("5 min ago");
  expect(ago(fr, "2026-10-24T09:00:00Z", now)).toBe("il y a 3 h");
});
