import { join, normalize } from "node:path";
import { catalogSettings, identity, newEpisodeAlerts, refreshCatalog } from "./container";
import { app } from "./app";
import { ORIGINS, PORT } from "@/shared/config";
import { withSecureCookies } from "@/shared/http";
import { LOG_LEVEL, logger } from "@/shared/logger";
import { VERSION } from "@/shared/version";

const WEB_DIST = normalize(process.env.WEB_DIST ?? join(import.meta.dir, "../../web/dist"));

// Built web app: hashed assets are cached forever, everything else falls back to the SPA shell.
app.get("*", async (c) => {
  const path = normalize(join(WEB_DIST, c.req.path));
  const file = Bun.file(path);
  if (path.startsWith(WEB_DIST) && c.req.path !== "/" && (await file.exists())) {
    const immutable = c.req.path.startsWith("/assets/");
    return new Response(file, { headers: { "cache-control": immutable ? "public, max-age=31536000, immutable" : "no-cache" } });
  }
  return new Response(Bun.file(join(WEB_DIST, "index.html")), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" },
  });
});

Bun.serve({
  port: PORT,
  // The socket address is the only client IP we trust (auth rate limiting); a client-sent header is overwritten.
  async fetch(req, server) {
    const headers = new Headers(req.headers);
    headers.set("x-snug-client-ip", server.requestIP(req)?.address ?? "unknown");
    return withSecureCookies(req, await app.fetch(new Request(req, { headers })));
  },
});
const users = identity.listUsers().length;
logger.info(
  `Snug ${VERSION} listening on :${PORT} · origins ${ORIGINS.join(", ") || "none (set SNUG_ORIGINS)"} · ` +
    `TMDB key ${catalogSettings.tmdbKey() ? "set" : "missing"} · ${users} user${users === 1 ? "" : "s"} · log level ${LOG_LEVEL}`,
);

const refresh = () => refreshCatalog().catch((err) => logger.error({ err }, "Catalog refresh failed"));
setTimeout(refresh, 30_000);
setInterval(refresh, 6 * 60 * 60 * 1000);

const announce = () => newEpisodeAlerts.run().catch((err) => logger.error({ err }, "New episode alerts failed"));
setTimeout(announce, 60_000);
setInterval(announce, 60 * 60 * 1000);
