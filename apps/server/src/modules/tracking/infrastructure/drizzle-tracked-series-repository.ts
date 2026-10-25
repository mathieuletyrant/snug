import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/shared/db";
import {
  type Rating,
  type Status,
  TrackedSeries,
  type TrackedSeriesRepository,
  type Watch,
} from "@/modules/tracking/domain/tracked-series";
import { ratings, trackedSeries, watches } from "./schema";

type Row = typeof trackedSeries.$inferSelect;

export class DrizzleTrackedSeriesRepository implements TrackedSeriesRepository {
  constructor(private readonly db: Db) {}

  async find(userId: string, seriesId: number) {
    const row = this.db
      .select()
      .from(trackedSeries)
      .where(and(eq(trackedSeries.userId, userId), eq(trackedSeries.seriesId, seriesId)))
      .get();
    return row ? this.hydrate([row])[0]! : null;
  }

  async listByUser(userId: string) {
    return this.hydrate(this.db.select().from(trackedSeries).where(eq(trackedSeries.userId, userId)).all());
  }

  async listBySeries(seriesId: number) {
    return this.hydrate(this.db.select().from(trackedSeries).where(eq(trackedSeries.seriesId, seriesId)).all());
  }

  async seriesIdsWithStatus(statuses: readonly Status[]) {
    return this.db
      .selectDistinct({ id: trackedSeries.seriesId })
      .from(trackedSeries)
      .where(inArray(trackedSeries.status, [...statuses]))
      .all()
      .map((r) => r.id);
  }

  async save(t: TrackedSeries) {
    const key = and(eq(watches.userId, t.userId), eq(watches.seriesId, t.seriesId));
    const row = { userId: t.userId, seriesId: t.seriesId, status: t.status, addedAt: t.addedAt, savingTarget: t.savingTarget };
    this.db.transaction((tx) => {
      tx.insert(trackedSeries)
        .values(row)
        .onConflictDoUpdate({
          target: [trackedSeries.userId, trackedSeries.seriesId],
          set: { status: t.status, savingTarget: t.savingTarget },
        })
        .run();
      tx.delete(watches).where(key).run();
      const rows = t.watches.map((w) => ({ ...w, userId: t.userId, seriesId: t.seriesId }));
      // ponytail: rewrites all Watches of the Series on save; diff them if Series with thousands of Episodes get slow.
      for (let i = 0; i < rows.length; i += 500) tx.insert(watches).values(rows.slice(i, i + 500)).run();
      tx.delete(ratings)
        .where(and(eq(ratings.userId, t.userId), eq(ratings.seriesId, t.seriesId), eq(ratings.episode, 0)))
        .run();
      if (t.ratings.length) {
        tx.insert(ratings).values(t.ratings.map((r) => ({ ...r, userId: t.userId, seriesId: t.seriesId }))).run();
      }
    });
  }

  async delete(userId: string, seriesId: number) {
    this.db.transaction((tx) => {
      tx.delete(watches).where(and(eq(watches.userId, userId), eq(watches.seriesId, seriesId))).run();
      tx.delete(ratings).where(and(eq(ratings.userId, userId), eq(ratings.seriesId, seriesId))).run();
      tx.delete(trackedSeries)
        .where(and(eq(trackedSeries.userId, userId), eq(trackedSeries.seriesId, seriesId)))
        .run();
    });
  }

  /** Loads Watches and Ratings for many rows in one query each per user. */
  private hydrate(rows: Row[]): TrackedSeries[] {
    if (!rows.length) return [];
    const byKey = new Map<string, Watch[]>();
    const ratingsByKey = new Map<string, Rating[]>();
    for (const userId of new Set(rows.map((r) => r.userId))) {
      const ids = rows.filter((r) => r.userId === userId).map((r) => r.seriesId);
      const ws = this.db
        .select()
        .from(watches)
        .where(and(eq(watches.userId, userId), inArray(watches.seriesId, ids)))
        .all();
      for (const { userId: u, seriesId, ...w } of ws) {
        const k = `${u}:${seriesId}`;
        const list = byKey.get(k);
        if (list) list.push(w);
        else byKey.set(k, [w]);
      }
      const rs = this.db
        .select()
        .from(ratings)
        // Episode Ratings aren't rated in Snug yet.
        .where(and(eq(ratings.userId, userId), inArray(ratings.seriesId, ids), eq(ratings.episode, 0)))
        .all();
      for (const { userId: u, seriesId, episode: _, ...r } of rs) {
        const k = `${u}:${seriesId}`;
        ratingsByKey.set(k, [...(ratingsByKey.get(k) ?? []), r]);
      }
    }
    return rows.map((r) => {
      const k = `${r.userId}:${r.seriesId}`;
      return TrackedSeries.restore({ ...r, watches: byKey.get(k) ?? [], ratings: ratingsByKey.get(k) ?? [] });
    });
  }
}
