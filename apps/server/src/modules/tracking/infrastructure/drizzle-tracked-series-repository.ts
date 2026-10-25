import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/shared/db";
import { type Status, TrackedSeries, type TrackedSeriesRepository, type Watch } from "@/modules/tracking/domain/tracked-series";
import { trackedSeries, watches } from "./schema";

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
    });
  }

  async delete(userId: string, seriesId: number) {
    this.db.transaction((tx) => {
      tx.delete(watches).where(and(eq(watches.userId, userId), eq(watches.seriesId, seriesId))).run();
      tx.delete(trackedSeries)
        .where(and(eq(trackedSeries.userId, userId), eq(trackedSeries.seriesId, seriesId)))
        .run();
    });
  }

  /** Loads Watches for many rows in one query per user. */
  private hydrate(rows: Row[]): TrackedSeries[] {
    if (!rows.length) return [];
    const byKey = new Map<string, Watch[]>();
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
    }
    return rows.map((r) => TrackedSeries.restore({ ...r, watches: byKey.get(`${r.userId}:${r.seriesId}`) ?? [] }));
  }
}
