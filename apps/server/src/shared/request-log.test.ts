import { expect, test } from "bun:test";
import { levelFor, maskTokens } from "./request-log";

test("tokens in integration URLs never reach the logs", () => {
  expect(maskTokens("/api/webhooks/jellyfin/abc123")).toBe("/api/webhooks/jellyfin/***");
  expect(maskTokens("/api/feeds/abc123/sonarr")).toBe("/api/feeds/***/sonarr");
  expect(maskTokens("/api/watchlist/abc123")).toBe("/api/watchlist/***");
  expect(maskTokens("/api/series/42")).toBe("/api/series/42");
  expect(maskTokens("/api/feeds/")).toBe("/api/feeds/");
});

test("failures always show, integration calls show at info, the rest only at debug", () => {
  expect(levelFor("/api/series", 500)).toBe("error");
  expect(levelFor("/api/webhooks/jellyfin/***", 400)).toBe("warn");
  expect(levelFor("/api/feeds/***/sonarr", 200)).toBe("info");
  expect(levelFor("/api/home", 200)).toBe("debug");
  expect(levelFor("/api/me", 401)).toBe("debug");
  expect(levelFor("/api/auth/sign-in/email", 401)).toBe("warn");
  expect(levelFor("/assets/index.js", 304)).toBe("debug");
});
