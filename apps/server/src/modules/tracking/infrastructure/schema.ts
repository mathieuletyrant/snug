import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "../../identity/infrastructure/schema";
import type { Status } from "../domain/tracked-series";

export const trackedSeries = sqliteTable(
  "tracked_series",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    seriesId: integer("series_id").notNull(),
    status: text("status").$type<Status>().notNull(),
    addedAt: integer("added_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.seriesId] })],
);

export const watches = sqliteTable(
  "watches",
  {
    userId: text("user_id").notNull(),
    seriesId: integer("series_id").notNull(),
    season: integer("season").notNull(),
    number: integer("number").notNull(),
    watchedAt: integer("watched_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.seriesId, t.season, t.number] })],
);
