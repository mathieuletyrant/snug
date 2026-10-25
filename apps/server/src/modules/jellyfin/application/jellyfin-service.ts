import { desc, eq, and, ne, notInArray } from "drizzle-orm";
import { type Episode, type EpisodeRef, episodeCode, isTitleHidden, type JellyfinEventLog } from "@snug/shared";
import type { CatalogService } from "@/modules/catalog/application/catalog-service";
import type { IdentityService } from "@/modules/identity/application/identity-service";
import type { Db } from "@/shared/db";
import { ForbiddenError } from "@/shared/errors";
import { moduleLogger, reason } from "@/shared/logger";
import type { Notifier } from "@/modules/notifications/application/notification-service";
import type { TrackingService } from "@/modules/tracking/application/tracking-service";
import { type JellyfinEvent, parseJellyfinEvent } from "@/modules/jellyfin/domain/jellyfin-event";
import { jellyfinEvents, jellyfinSeries } from "@/modules/jellyfin/infrastructure/schema";
import { t } from "@/shared/i18n";
import { today } from "@/shared/day";

/** Ignored and failed calls kept; Watched ones are all kept, only the payloads of older ones are dropped. */
const KEEP_EVENTS = 100;
const MAX_PAYLOAD = 20_000;

const log = moduleLogger("jellyfin");

type Outcome = Pick<JellyfinEventLog, "outcome" | "message"> & { seriesId?: number };

export class JellyfinService {
  constructor(
    private readonly db: Db,
    private readonly identity: IdentityService,
    private readonly catalog: CatalogService,
    private readonly tracking: TrackingService,
    private readonly notifier: Notifier,
  ) {}

  private queue: Promise<unknown> = Promise.resolve();

  /**
   * Events are handled one at a time: marking a whole season played in Jellyfin fires a burst of events
   * for the same Series, and only the first one should fetch a new Series from TMDB.
   * ponytail: one global queue; per-user queues if several busy users ever share an instance.
   */
  handle(token: string, body: Record<string, unknown>) {
    const run = this.queue.then(() => this.process(token, body));
    this.queue = run.catch(() => {});
    return run;
  }

  private async process(token: string, body: Record<string, unknown>) {
    const userId = this.identity.webhookTokens.userIdOf(token);
    if (!userId) {
      log.warn("Webhook call with an unknown token (rotated? copied from another Snug?)");
      throw new ForbiddenError(t().errors.unknownWebhookToken);
    }

    const event = parseJellyfinEvent(body);
    const summary =
      event.kind === "episode-watched"
        ? `${event.seriesName} ${episodeCode(event)}`
        : `${String(body.NotificationType ?? "?")} · ${String(body.Name ?? body.ItemType ?? "")}`;

    let result: Outcome;
    try {
      result = event.kind === "ignored" ? { outcome: "ignored", message: event.reason } : await this.watch(userId, event);
    } catch (error) {
      result = { outcome: "error", message: error instanceof Error ? error.message : String(error) };
    }
    this.log(userId, summary, result, body);
    // Ignored calls come in bursts (UserDataSaved on every pause), so they only show at debug.
    const line = `${this.identity.nameOf(userId)} · ${summary} → ${result.outcome}: ${result.message}`;
    if (result.outcome === "watched") log.info(line);
    else if (result.outcome === "ignored") log.debug(line);
    else log.warn(line);
    return { outcome: result.outcome, message: result.message };
  }

  events(userId: string): JellyfinEventLog[] {
    return this.db
      .select()
      .from(jellyfinEvents)
      .where(eq(jellyfinEvents.userId, userId))
      .orderBy(desc(jellyfinEvents.id))
      .all()
      .map((row) => ({
        receivedAt: row.receivedAt.toISOString(),
        summary: row.summary,
        outcome: row.outcome,
        message: row.message,
        seriesId: row.seriesId,
        payload: row.payload,
      }));
  }

  private async watch(userId: string, event: Extract<JellyfinEvent, { kind: "episode-watched" }>): Promise<Outcome> {
    if (event.season === 0) return { outcome: "ignored", message: t().webhook.specials };

    const seriesId = await this.resolveSeries(event);
    if (!seriesId) return { outcome: "error", message: t().webhook.notFound };

    // An Episode newer than the cached Catalog means the Series needs a refresh.
    const series = await this.catalog.ensure(seriesId);
    if (!series.episodes.some((episode) => episode.season === event.season && episode.number === event.number)) {
      await this.catalog.refresh(seriesId);
    }
    const next = await this.tracking.watchEpisode(userId, seriesId, event);
    void this.announce(userId, seriesId, series.name, event, next);
    return { outcome: "watched", message: t().webhook.marked(series.name, episodeCode(event)), seriesId };
  }

  /** "✓ Severance S02E05", with what comes next; a season marked at once collapses into one notification. */
  private async announce(userId: string, seriesId: number, name: string, ep: EpisodeRef, next: Episode | null) {
    try {
      const day = today();
      const title = next && !isTitleHidden(this.identity.preferences(userId), { watched: false, next: true });
      await this.notifier.notify(userId, {
        title: `✓ ${name} ${episodeCode(ep)}`,
        body: !next
          ? t().push.caughtUp
          : next.airDate && next.airDate <= day
            ? t().push.next(episodeCode(next), title ? next.name : null)
            : next.airDate
              ? t().push.nextOn(episodeCode(next), next.airDate)
              : t().push.nextUndated(episodeCode(next)),
        url: `/series/${seriesId}`,
        tag: `series-${seriesId}`,
      });
    } catch (error) {
      log.warn(`Watch notification for series ${seriesId} failed: ${reason(error)}`);
    }
  }

  private async resolveSeries(event: Extract<JellyfinEvent, { kind: "episode-watched" }>) {
    const known = event.jellyfinSeriesId
      ? this.db.select().from(jellyfinSeries).where(eq(jellyfinSeries.jellyfinSeriesId, event.jellyfinSeriesId)).get()
      : undefined;
    if (known) return known.tmdbId;

    const tmdbId = await this.catalog.resolve({
      tmdbId: event.seriesTmdbId,
      tvdbEpisodeId: event.tvdbEpisodeId,
      imdbEpisodeId: event.imdbEpisodeId,
      title: event.seriesName,
    });
    if (tmdbId && event.jellyfinSeriesId) {
      this.db.insert(jellyfinSeries).values({ jellyfinSeriesId: event.jellyfinSeriesId, tmdbId }).onConflictDoNothing().run();
    }
    return tmdbId;
  }

  private log(userId: string, summary: string, result: Outcome, body: unknown) {
    const payload = JSON.stringify(body, null, 2).slice(0, MAX_PAYLOAD);
    this.db.insert(jellyfinEvents).values({ userId, summary, receivedAt: new Date(), payload, ...result }).run();

    // Ignored calls come in bursts (UserDataSaved on every pause): capping them all together pushed Watched ones out.
    const notWatched = and(eq(jellyfinEvents.userId, userId), ne(jellyfinEvents.outcome, "watched"));
    const keep = this.latestIds(notWatched);
    this.db.delete(jellyfinEvents).where(and(notWatched, notInArray(jellyfinEvents.id, keep))).run();

    const watched = and(eq(jellyfinEvents.userId, userId), eq(jellyfinEvents.outcome, "watched"));
    const keepPayload = this.latestIds(watched);
    this.db
      .update(jellyfinEvents)
      .set({ payload: null })
      .where(and(watched, notInArray(jellyfinEvents.id, keepPayload)))
      .run();
  }

  private latestIds(where: ReturnType<typeof and>) {
    return this.db
      .select({ id: jellyfinEvents.id })
      .from(jellyfinEvents)
      .where(where)
      .orderBy(desc(jellyfinEvents.id))
      .limit(KEEP_EVENTS)
      .all()
      .map((row) => row.id);
  }
}
