import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const series = sqliteTable("series", {
  tmdbId: integer("tmdb_id").primaryKey(),
  tvdbId: integer("tvdb_id"),
  name: text("name").notNull(),
  year: integer("year"),
  overview: text("overview").notNull().default(""),
  posterPath: text("poster_path"),
  backdropPath: text("backdrop_path"),
  ended: integer("ended", { mode: "boolean" }).notNull(),
  fetchedAt: integer("fetched_at", { mode: "timestamp" }).notNull(),
});

export const episodes = sqliteTable(
  "episodes",
  {
    seriesId: integer("series_id")
      .notNull()
      .references(() => series.tmdbId, { onDelete: "cascade" }),
    season: integer("season").notNull(),
    number: integer("number").notNull(),
    name: text("name").notNull(),
    airDate: text("air_date"),
    runtime: integer("runtime"),
  },
  (t) => [primaryKey({ columns: [t.seriesId, t.season, t.number] })],
);

/** Instance-wide settings (e.g. the TMDB key). */
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
