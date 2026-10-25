import { eq } from "drizzle-orm";
import { DEFAULT_LANGUAGE } from "@snug/shared";
import type { Db } from "@/shared/db";
import { appSettings } from "./schema";

/** Instance-wide Catalog settings, cached in memory (read on every TMDB call). */
export class CatalogSettings {
  private readonly cache = new Map<string, string | null>();

  constructor(private readonly db: Db) {}

  tmdbKey = (): string | null => this.read("tmdb_key");
  /** TMDB language for descriptions, episode names, posters and search (e.g. "fr-FR"). */
  language = (): string => this.read("language") ?? DEFAULT_LANGUAGE;

  setTmdbKey(value: string) {
    this.write("tmdb_key", value);
  }

  setLanguage(value: string) {
    this.write("language", value);
  }

  private read(key: string): string | null {
    if (!this.cache.has(key)) {
      this.cache.set(key, this.db.select().from(appSettings).where(eq(appSettings.key, key)).get()?.value ?? null);
    }
    return this.cache.get(key) ?? null;
  }

  private write(key: string, value: string) {
    this.db.insert(appSettings).values({ key, value }).onConflictDoUpdate({ target: appSettings.key, set: { value } }).run();
    this.cache.set(key, value);
  }
}
