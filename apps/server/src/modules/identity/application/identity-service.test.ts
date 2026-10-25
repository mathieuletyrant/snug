import { expect, test } from "bun:test";
import { DEFAULT_PREFERENCES } from "@snug/shared";
import { testDb } from "@/shared/testing";
import type { Auth } from "@/modules/identity/infrastructure/auth";
import { IdentityService } from "./identity-service";

const setup = () => new IdentityService(testDb(["first", "second"]).db, {} as Auth);

test("the first account is the admin", () => {
  const identity = setup();
  expect(identity.isAdmin("first")).toBe(true);
  expect(identity.isAdmin("second")).toBe(false);
  expect(identity.listUsers().map((u) => u.id)).toEqual(["first", "second"]);
});

test("preferences start from the defaults and keep what was changed", () => {
  const identity = setup();
  expect(identity.preferences("first")).toEqual(DEFAULT_PREFERENCES);
  identity.updatePreferences("first", { episodeTitles: "hideAll" });
  identity.updatePreferences("first", { newForDays: 3 });
  expect(identity.preferences("first")).toEqual({ ...DEFAULT_PREFERENCES, episodeTitles: "hideAll", newForDays: 3 });
  expect(identity.preferences("second")).toEqual(DEFAULT_PREFERENCES);
});

test("a token is made once per User, and a new one replaces it", () => {
  const { webhookTokens } = setup();
  const token = webhookTokens.of("first");
  expect(webhookTokens.of("first")).toBe(token);
  expect(webhookTokens.userIdOf(token)).toBe("first");

  const next = webhookTokens.rotate("first");
  expect(next).not.toBe(token);
  expect(webhookTokens.userIdOf(token)).toBeNull();
  expect(webhookTokens.userIdOf(next)).toBe("first");
});
