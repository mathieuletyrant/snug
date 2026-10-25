import type { MiddlewareHandler } from "hono";
import { moduleLogger } from "./logger";

const log = moduleLogger("http");

/** URLs whose next segment is a secret token: it identifies a User to Jellyfin, Sonarr or Spotarr. */
const TOKEN_PREFIXES = ["/api/webhooks/jellyfin/", "/api/feeds/", "/api/watchlist/"];

/** The path with any token replaced by `***`, safe to write to logs. */
export function maskTokens(path: string): string {
  for (const prefix of TOKEN_PREFIXES) {
    if (path.startsWith(prefix) && path.length > prefix.length) {
      return prefix + path.slice(prefix.length).replace(/^[^/]+/, "***");
    }
  }
  return path;
}

/** Calls other apps make (webhooks, Sonarr list): worth a line even when they succeed. */
const isIntegration = (path: string) => path === "/api/mcp" || TOKEN_PREFIXES.some((prefix) => path.startsWith(prefix));

export function levelFor(path: string, status: number): "error" | "warn" | "info" | "debug" {
  if (status >= 500) return "error";
  // A signed-out page asking who is there is routine; a refused sign-in is not.
  if (status === 401 && !path.startsWith("/api/auth/")) return "debug";
  // MCP clients first try a GET for server events, which Snug doesn't send.
  if (status === 405 && path === "/api/mcp") return "debug";
  if (status >= 400) return "warn";
  return isIntegration(path) ? "info" : "debug";
}

/** One line per request: `POST /api/webhooks/jellyfin/*** 400 3ms (Expected a JSON body)`. */
export const requestLog: MiddlewareHandler = async (c, next) => {
  const start = performance.now();
  await next();
  const path = maskTokens(c.req.path);
  const status = c.res.status;
  const ms = Math.round(performance.now() - start);
  const error = c.error?.message;
  log[levelFor(path, status)](`${c.req.method} ${path} ${status} ${ms}ms${error ? ` (${error})` : ""}`);
};
