import type { EpisodeRef, Status } from "@snug/shared";

export { STATUSES, type EpisodeRef, type Status } from "@snug/shared";

export interface Watch extends EpisodeRef {
  watchedAt: Date;
}

/** What tracking needs to know about a Series' Episodes. */
export interface Timeline {
  ended: boolean;
  episodes: readonly (EpisodeRef & { airDate: string | null })[];
}

export const compareEpisodes = (a: EpisodeRef, b: EpisodeRef) => a.season - b.season || a.number - b.number;
const keyOf = (e: EpisodeRef) => `${e.season}x${e.number}`;
const hasAired = (e: { airDate: string | null }, today: string) => e.airDate !== null && e.airDate <= today;

/** Aggregate root: a User's relationship to one Series. */
export class TrackedSeries {
  private constructor(
    readonly userId: string,
    readonly seriesId: number,
    private _status: Status,
    private readonly _watches: Map<string, Watch>,
    readonly addedAt: Date,
  ) {}

  static start(userId: string, seriesId: number, status: Status, now: Date) {
    return new TrackedSeries(userId, seriesId, status, new Map(), now);
  }

  static restore(p: { userId: string; seriesId: number; status: Status; watches: Watch[]; addedAt: Date }) {
    return new TrackedSeries(p.userId, p.seriesId, p.status, new Map(p.watches.map((w) => [keyOf(w), w])), p.addedAt);
  }

  get status() {
    return this._status;
  }

  get watches(): Watch[] {
    return [...this._watches.values()];
  }

  hasWatched(ep: EpisodeRef) {
    return this._watches.has(keyOf(ep));
  }

  /** Watching again pulls a Paused or Watchlist Series back to Watching; Dropped stays Dropped. */
  watch(ep: EpisodeRef, at: Date) {
    const key = keyOf(ep);
    if (!this._watches.has(key)) this._watches.set(key, { season: ep.season, number: ep.number, watchedAt: at });
    if (this._status === "paused" || this._status === "watchlist") this._status = "watching";
  }

  unwatch(ep: EpisodeRef) {
    this._watches.delete(keyOf(ep));
  }

  changeStatus(status: Status) {
    this._status = status;
  }

  /** Furthest Episode watched, regardless of rewatches. */
  get progress(): EpisodeRef | null {
    let furthest: EpisodeRef | null = null;
    for (const w of this._watches.values()) if (!furthest || compareEpisodes(w, furthest) > 0) furthest = w;
    return furthest && { season: furthest.season, number: furthest.number };
  }

  get lastWatchedAt(): Date | null {
    let last: Date | null = null;
    for (const w of this._watches.values()) if (!last || w.watchedAt > last) last = w.watchedAt;
    return last;
  }

  /** First un-watched Episode after the Progress. */
  nextEpisode<E extends EpisodeRef>(episodes: readonly E[]): E | null {
    const progress = this.progress;
    return (
      [...episodes]
        .sort(compareEpisodes)
        .find((e) => (!progress || compareEpisodes(e, progress) > 0) && !this.hasWatched(e)) ?? null
    );
  }

  /** Completed means: the Series has ended and nothing aired is left after the Progress (gaps before it don't count). */
  reconcile(timeline: Timeline, today: string) {
    if (!timeline.episodes.length) return;
    const done = timeline.ended && !this.nextEpisode(timeline.episodes.filter((e) => hasAired(e, today)));
    if (this._status === "watching" && done) this._status = "completed";
    else if (this._status === "completed" && !done) this._status = "watching";
  }
}

/** Ready: the Next Episode has aired. Upcoming: caught up, waiting for it. */
export function availability(next: { airDate: string | null } | null, today: string): "ready" | "upcoming" {
  return next && hasAired(next, today) ? "ready" : "upcoming";
}

export interface TrackedSeriesRepository {
  find(userId: string, seriesId: number): Promise<TrackedSeries | null>;
  listByUser(userId: string): Promise<TrackedSeries[]>;
  listBySeries(seriesId: number): Promise<TrackedSeries[]>;
  /** Distinct Series ids tracked by anyone with one of these Statuses. */
  seriesIdsWithStatus(statuses: readonly Status[]): Promise<number[]>;
  save(tracked: TrackedSeries): Promise<void>;
  delete(userId: string, seriesId: number): Promise<void>;
}
