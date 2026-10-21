import { and, asc, eq, inArray, lt } from "drizzle-orm";
import type { Db } from "../../../shared/db";
import type { CatalogRepository, Episode, Series } from "../domain/series";
import { episodes, series } from "./schema";

export class DrizzleCatalogRepository implements CatalogRepository {
  constructor(private readonly db: Db) {}

  async get(tmdbId: number) {
    return (await this.getMany([tmdbId])).get(tmdbId) ?? null;
  }

  async getMany(tmdbIds: readonly number[]) {
    const result = new Map<number, Series>();
    if (!tmdbIds.length) return result;
    const ids = [...tmdbIds];
    const rows = this.db.select().from(series).where(inArray(series.tmdbId, ids)).all();
    for (const row of rows) result.set(row.tmdbId, { ...row, episodes: [] });
    const eps = this.db
      .select()
      .from(episodes)
      .where(inArray(episodes.seriesId, ids))
      .orderBy(asc(episodes.season), asc(episodes.number))
      .all();
    for (const { seriesId, ...ep } of eps) result.get(seriesId)?.episodes.push(ep satisfies Episode);
    return result;
  }

  async save({ episodes: eps, ...row }: Series) {
    this.db.transaction((tx) => {
      tx.insert(series).values(row).onConflictDoUpdate({ target: series.tmdbId, set: row }).run();
      tx.delete(episodes).where(eq(episodes.seriesId, row.tmdbId)).run();
      if (eps.length) tx.insert(episodes).values(eps.map((e) => ({ ...e, seriesId: row.tmdbId }))).run();
    });
  }

  async stale(tmdbIds: readonly number[], before: Date) {
    if (!tmdbIds.length) return [];
    const ids = [...tmdbIds];
    const known = new Set(
      this.db
        .select({ id: series.tmdbId })
        .from(series)
        .where(inArray(series.tmdbId, ids))
        .all()
        .map((r) => r.id),
    );
    const old = this.db
      .select({ id: series.tmdbId })
      .from(series)
      .where(and(inArray(series.tmdbId, ids), lt(series.fetchedAt, before)))
      .all()
      .map((r) => r.id);
    return [...ids.filter((id) => !known.has(id)), ...old];
  }
}
