import { afterEach, expect, test } from "bun:test";
import { parseCsvImport } from "@/modules/import/domain/csv-import";
import { setLanguageSource, t } from "./i18n";

afterEach(() => setLanguageSource(() => "en-US"));

test("messages follow the instance's language, read at the time of use", () => {
  let language = "en-US";
  setLanguageSource(() => language);
  expect(t().push.caughtUp).toBe("You're all caught up.");
  language = "fr-FR";
  expect(t().push.caughtUp).toBe("Vous êtes à jour.");
  language = "de-DE"; // the app isn't written in German: English
  expect(t().push.caughtUp).toBe("You're all caught up.");
});

test("import problems come in French too", () => {
  setLanguageSource(() => "fr-FR");
  expect(() => parseCsvImport("title,season\nSeverance,x")).toThrow("Ligne 2 : season doit être un nombre entier");
});
