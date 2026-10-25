import { type EpisodeRef, type Saving, type SavingTarget, STATUSES, type Status } from "@snug/shared";

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

/** The Completed rule: Watching and Saving up end in Completed once done; Completed returns to Watching otherwise. */
const settle = (status: Status, done: boolean): Status =>
  done && (status === "watching" || status === "saving") ? "completed" : !done && status === "completed" ? "watching" : status;

/** Aggregate root: a User's relationship to one Series. */
export class TrackedSeries {
  private constructor(
    readonly userId: string,
    readonly seriesId: number,
    private _status: Status,
    private readonly _watches: Map<string, Watch>,
    readonly addedAt: Date,
    private _savingTarget: SavingTarget = 0,
  ) {}

  static start(userId: string, seriesId: number, status: Status, now: Date) {
    return new TrackedSeries(userId, seriesId, status, new Map(), now);
  }

  static restore(p: {
    userId: string;
    seriesId: number;
    status: Status;
    watches: Watch[];
    addedAt: Date;
    savingTarget: SavingTarget;
  }) {
    const watches = new Map(p.watches.map((w) => [keyOf(w), w]));
    return new TrackedSeries(p.userId, p.seriesId, p.status, watches, p.addedAt, p.savingTarget);
  }

  get status() {
    return this._status;
  }

  get savingTarget() {
    return this._savingTarget;
  }

  get watches(): Watch[] {
    return [...this._watches.values()];
  }

  hasWatched(ep: EpisodeRef) {
    return this._watches.has(keyOf(ep));
  }

  /** Watching again pulls a Paused, Saving up or Watchlist Series back to Watching; Dropped stays Dropped. */
  watch(ep: EpisodeRef, at: Date) {
    this.add(ep, at);
    if (this._status === "paused" || this._status === "saving" || this._status === "watchlist") this._status = "watching";
  }

  /** Imported Watches merge in without moving the Status: an imported Paused Series stays Paused. */
  merge(watches: readonly Watch[]) {
    for (const w of watches) this.add(w, w.watchedAt);
  }

  private add(ep: EpisodeRef, at: Date) {
    const key = keyOf(ep);
    if (!this._watches.has(key)) this._watches.set(key, { season: ep.season, number: ep.number, watchedAt: at });
  }

  unwatch(ep: EpisodeRef) {
    this._watches.delete(keyOf(ep));
  }

  /**
   * A Status the User picks. The Completed rule applies right away (see `reconcile`): Completed on a Series
   * with Episodes left becomes Watching. `savingTarget` only matters for Saving up: a full season (0) or a
   * number of Episodes.
   */
  choose(status: Status, timeline: Timeline, today: string, savingTarget?: SavingTarget) {
    this._status = status;
    if (savingTarget !== undefined) this._savingTarget = savingTarget;
    this.reconcile(timeline, today);
  }

  /**
   * Saving up: the Episodes after the Progress not watched yet, and how many of them aired. A full season
   * counts the Next Episode's season as TMDB lists it; a number counts across seasons.
   */
  saving(episodes: readonly (EpisodeRef & { airDate: string | null })[], today: string): Saving {
    const next = this.nextEpisode(episodes);
    const ahead = [...episodes]
      .sort(compareEpisodes)
      .filter((e) => next && compareEpisodes(e, next) >= 0 && !this.hasWatched(e));
    const out = ahead.filter((e) => hasAired(e, today)).length;
    if (this._savingTarget === 0) {
      const season = ahead.filter((e) => e.season === next?.season);
      const last = season.at(-1);
      return {
        target: 0,
        out: season.filter((e) => hasAired(e, today)).length,
        needed: season.length,
        reached: season.length > 0 && season.every((e) => hasAired(e, today)),
        completeOn: last?.airDate ?? null,
      };
    }
    return {
      target: this._savingTarget,
      out,
      needed: this._savingTarget,
      reached: out >= this._savingTarget,
      completeOn: ahead[this._savingTarget - 1]?.airDate ?? null,
    };
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

  /**
   * Completed means: the Series has ended and nothing aired is left after the Progress (gaps before it don't
   * count). Watching and Saving up become Completed then; Completed returns to Watching otherwise.
   */
  reconcile(timeline: Timeline, today: string) {
    const done = this.done(timeline, today);
    if (done !== null) this._status = settle(this._status, done);
  }

  /** The Statuses `choose` keeps as picked: no Completed while Episodes are left, only Completed once done. */
  choosable(timeline: Timeline, today: string): Status[] {
    const done = this.done(timeline, today);
    return STATUSES.filter((s) => done === null || settle(s, done) === s);
  }

  /** Whether the Series has ended with nothing aired left after the Progress; null before the Catalog knows its Episodes. */
  private done(timeline: Timeline, today: string) {
    if (!timeline.episodes.length) return null;
    return timeline.ended && !this.nextEpisode(timeline.episodes.filter((e) => hasAired(e, today)));
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
