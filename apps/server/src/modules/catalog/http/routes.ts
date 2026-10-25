import { Hono, type MiddlewareHandler } from "hono";
import { z } from "zod";
import { InvalidInputError } from "@/shared/errors";
import { type AuthEnv, jsonBody, parse } from "@/shared/http";
import type { CatalogService } from "@/modules/catalog/application/catalog-service";
import type { CatalogSettings } from "@/modules/catalog/infrastructure/settings-store";
import { cachedImage } from "@/modules/catalog/infrastructure/image-cache";
import { isValidTmdbKey } from "@/modules/catalog/infrastructure/tmdb-client";
import { t } from "@/shared/i18n";

export const catalogRoutes = (
  catalog: CatalogService,
  settings: CatalogSettings,
  adminOnly: MiddlewareHandler<AuthEnv>,
  /** Called after a language change: every cached Series must be fetched again. */
  onLanguageChanged: () => void,
) =>
  new Hono<AuthEnv>()
    .get("/search", async (c) => {
      const q = c.req.query("q")?.trim();
      return c.json(q ? await catalog.search(q) : []);
    })
    .put("/settings/tmdb-key", adminOnly, async (c) => {
      const { key } = parse(z.object({ key: z.string().trim().min(10, { error: () => t().errors.tmdbKeyShape }) }), await jsonBody(c));
      if (!(await isValidTmdbKey(key))) throw new InvalidInputError(t().errors.tmdbKeyRejected, { key: t().errors.tmdbKeyRejected });
      settings.setTmdbKey(key);
      return c.body(null, 204);
    })
    .put("/settings/language", adminOnly, async (c) => {
      const { language } = parse(
        z.object({ language: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/, { error: () => t().errors.tmdbLocale }) }),
        await jsonBody(c),
      );
      if (language !== settings.language()) {
        settings.setLanguage(language);
        onLanguageChanged();
      }
      return c.body(null, 204);
    });

/** Public: images are not private and must load in <img> tags and the service worker cache. */
export const imageRoutes = () =>
  new Hono().get("/:size/:file", async (c) => {
    const image = await cachedImage(c.req.param("size"), c.req.param("file"));
    if (!image) return c.body(null, 404);
    return c.body(image.stream(), 200, {
      "content-type": image.type || "image/jpeg",
      "cache-control": "public, max-age=31536000, immutable",
    });
  });
