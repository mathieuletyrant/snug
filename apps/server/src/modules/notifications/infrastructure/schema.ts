import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "@/modules/identity/infrastructure/schema";

/** One row per device that accepted notifications (a browser's push subscription). */
export const pushSubscriptions = sqliteTable("push_subscriptions", {
  endpoint: text("endpoint").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

/** New Episodes a User was notified about, so each one is announced once. */
export const episodeAlerts = sqliteTable(
  "episode_alerts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    seriesId: integer("series_id").notNull(),
    season: integer("season").notNull(),
    number: integer("number").notNull(),
    sentAt: integer("sent_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.seriesId, t.season, t.number] })],
);
