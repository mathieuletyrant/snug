import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "@/modules/identity/infrastructure/schema";
import type { SavingTarget } from "@snug/shared";
import type { Status } from "@/modules/tracking/domain/tracked-series";

export const trackedSeries = sqliteTable(
  "tracked_series",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    seriesId: integer("series_id").notNull(),
    status: text("status").$type<Status>().notNull(),
    /** Saving up until a full season (0) or this many Episodes. */
    savingTarget: integer("saving_target").$type<SavingTarget>().notNull().default(0),
    /** Absolute numbering: Episodes read as "Ep. 1156" rather than SxxEyy. */
    absoluteNumbering: integer("absolute_numbering", { mode: "boolean" }).notNull().default(false),
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

/** Ratings out of 10: of a Series (season 0, episode 0), a season (episode 0), or one Episode. 0 rather than null: two nulls never clash in a key. */
export const ratings = sqliteTable(
  "ratings",
  {
    userId: text("user_id").notNull(),
    seriesId: integer("series_id").notNull(),
    season: integer("season").notNull(),
    episode: integer("episode").notNull().default(0),
    rating: integer("rating").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.seriesId, t.season, t.episode] })],
);
