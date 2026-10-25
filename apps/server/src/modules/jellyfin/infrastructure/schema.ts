import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { JellyfinEventLog } from "@snug/shared";
import { user } from "@/modules/identity/infrastructure/schema";

/** Jellyfin series id → TMDB id, so each series is resolved against TMDB only once. */
export const jellyfinSeries = sqliteTable("jellyfin_series", {
  jellyfinSeriesId: text("jellyfin_series_id").primaryKey(),
  tmdbId: integer("tmdb_id").notNull(),
});

export const jellyfinEvents = sqliteTable("jellyfin_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  receivedAt: integer("received_at", { mode: "timestamp" }).notNull(),
  summary: text("summary").notNull(),
  outcome: text("outcome").$type<JellyfinEventLog["outcome"]>().notNull(),
  message: text("message").notNull(),
  seriesId: integer("series_id"),
  payload: text("payload"),
});
