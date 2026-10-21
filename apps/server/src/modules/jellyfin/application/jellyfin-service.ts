import { desc, eq, and, notInArray } from "drizzle-orm";
import { episodeCode, type JellyfinEventLog } from "@snug/shared";
import type { CatalogService } from "../../catalog/application/catalog-service";
import type { IdentityService } from "../../identity/application/identity-service";
import type { Db } from "../../../shared/db";
import { ForbiddenError } from "../../../shared/errors";
import type { TrackingService } from "../../tracking/application/tracking-service";
import { type JellyfinEvent, parseJellyfinEvent } from "../domain/jellyfin-event";
import { jellyfinEvents, jellyfinSeries } from "../infrastructure/schema";

const KEEP_EVENTS = 100;
const MAX_PAYLOAD = 20_000;

type Outcome = Pick<JellyfinEventLog, "outcome" | "message"> & { seriesId?: number };

export class JellyfinService {
  constructor(
    private readonly db: Db,
    private readonly identity: IdentityService,
    private readonly catalog: CatalogService,
    private readonly tracking: TrackingService,
  ) {}

  private queue: Promise<unknown> = Promise.resolve();

  /**
   * Events are handled one at a time: marking a whole season played in Jellyfin fires a burst of
   * events for the same Series, and concurrent read-modify-write of one TrackedSeries would lose Watches.
   * ponytail: one global queue; per-user queues if several busy users ever share an instance.
   */
  handle(token: string, body: Record<string, unknown>) {
    const run = this.queue.then(() => this.process(token, body));
    this.queue = run.catch(() => {});
    return run;
  }

  private async process(token: string, body: Record<string, unknown>) {
    const userId = this.identity.webhookTokens.userIdOf(token);
    if (!userId) throw new ForbiddenError("Unknown webhook token");

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
    return { outcome: result.outcome, message: result.message };
  }

  events(userId: string): JellyfinEventLog[] {
    return this.db
      .select()
      .from(jellyfinEvents)
      .where(eq(jellyfinEvents.userId, userId))
      .orderBy(desc(jellyfinEvents.id))
      .all()
      .map((e) => ({
        receivedAt: e.receivedAt.toISOString(),
        summary: e.summary,
        outcome: e.outcome,
        message: e.message,
        seriesId: e.seriesId,
        payload: e.payload,
      }));
  }

  private async watch(userId: string, event: Extract<JellyfinEvent, { kind: "episode-watched" }>): Promise<Outcome> {
    if (event.season === 0) return { outcome: "ignored", message: "Specials are not tracked" };

    const seriesId = await this.resolveSeries(event);
    if (!seriesId) return { outcome: "error", message: "Could not find this series on TMDB" };

    // An Episode newer than the cached Catalog means the Series needs a refresh.
    const series = await this.catalog.ensure(seriesId);
    if (!series.episodes.some((e) => e.season === event.season && e.number === event.number)) {
      await this.catalog.refresh(seriesId);
    }
    await this.tracking.watchEpisode(userId, seriesId, event);
    return { outcome: "watched", message: `Marked ${series.name} ${episodeCode(event)} as watched`, seriesId };
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
    const keep = this.db
      .select({ id: jellyfinEvents.id })
      .from(jellyfinEvents)
      .where(eq(jellyfinEvents.userId, userId))
      .orderBy(desc(jellyfinEvents.id))
      .limit(KEEP_EVENTS)
      .all()
      .map((e) => e.id);
    this.db.delete(jellyfinEvents).where(and(eq(jellyfinEvents.userId, userId), notInArray(jellyfinEvents.id, keep))).run();
  }
}
