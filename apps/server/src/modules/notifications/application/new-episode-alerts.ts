import { episodeCode, type Episode, type Preferences } from "@snug/shared";
import { and, eq } from "drizzle-orm";
import type { Db } from "../../../shared/db";
import { today } from "../../../shared/async";
import { moduleLogger } from "../../../shared/logger";
import { episodeAlerts } from "../infrastructure/schema";
import type { Notifier } from "./notification-service";

const log = moduleLogger("push");
const DAY = 24 * 60 * 60 * 1000;

/**
 * Hour (UTC) from which a day's new Episodes are announced: TMDB air dates have no time, and in Europe
 * an Episode dated today is out by the evening. Yesterday's are still sent, in case Snug was down.
 */
export const SEND_FROM_HOUR_UTC = 16;

/** What the alerts need from tracking: who watches what airs on these days. */
export interface NewEpisodesSource {
  newEpisodesOn(
    days: readonly string[],
  ): Promise<{ userId: string; series: { tmdbId: number; name: string }; episodes: Episode[] }[]>;
}

/** Pushes "📺 Tracker · S04E02 is out" once per Episode to Users watching the Series. */
export class NewEpisodeAlerts {
  constructor(
    private readonly db: Db,
    private readonly source: NewEpisodesSource,
    private readonly notifier: Notifier,
    private readonly preferences: (userId: string) => Preferences,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Meant to run every hour; returns how many notifications it sent. */
  async run(): Promise<number> {
    const now = this.now();
    if (now.getUTCHours() < SEND_FROM_HOUR_UTC) return 0;
    const days = [today(new Date(now.getTime() - DAY)), today(now)];
    let sent = 0;
    for (const { userId, series, episodes } of await this.source.newEpisodesOn(days)) {
      if (!this.preferences(userId).notifyNewEpisodes) continue;
      const fresh = episodes.filter((e) => !this.alreadySent(userId, series.tmdbId, e));
      if (!fresh.length) continue;
      await this.notifier.notify(userId, {
        title: `📺 ${series.name}`,
        body: describe(fresh),
        url: `/series/${series.tmdbId}`,
        tag: `new-${series.tmdbId}`,
      });
      for (const e of fresh) {
        this.db
          .insert(episodeAlerts)
          .values({ userId, seriesId: series.tmdbId, season: e.season, number: e.number, sentAt: now })
          .onConflictDoNothing()
          .run();
      }
      sent++;
    }
    if (sent) log.info(`Announced new episodes ${sent} time${sent === 1 ? "" : "s"}`);
    return sent;
  }

  private alreadySent(userId: string, seriesId: number, e: Episode) {
    const row = this.db
      .select()
      .from(episodeAlerts)
      .where(
        and(
          eq(episodeAlerts.userId, userId),
          eq(episodeAlerts.seriesId, seriesId),
          eq(episodeAlerts.season, e.season),
          eq(episodeAlerts.number, e.number),
        ),
      )
      .get();
    return !!row;
  }
}

/** "S04E02 is out", or "8 new episodes: S02E01 to S02E08" for a whole season dropped at once. */
export function describe(episodes: Episode[]): string {
  const first = episodes[0]!;
  const last = episodes.at(-1)!;
  if (episodes.length === 1) return `${episodeCode(first)} is out`;
  return `${episodes.length} new episodes: ${episodeCode(first)} to ${episodeCode(last)}`;
}
