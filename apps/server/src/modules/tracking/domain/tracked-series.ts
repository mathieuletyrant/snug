import { type Airing, type EpisodeRef, type Saving, type SavingTarget, STATUSES, type Status } from "@snug/shared";
import { addDays, today as dayOf } from "@/shared/day";

export { STATUSES, type EpisodeRef, type Status } from "@snug/shared";

export interface Watch extends EpisodeRef {
  watchedAt: Date;
}

/** A User's rating out of 10, of a season or (season 0, which is never tracked otherwise) of the whole Series. */
export interface Rating {
  season: number;
  rating: number;
}

/** The `season` of the whole Series' Rating. */
export const WHOLE_SERIES = 0;

const isRating = (n: number) => Number.isInteger(n) && n >= 1 && n <= 10;

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
    private readonly _ratings = new Map<number, number>(),
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
    ratings?: Rating[];
  }) {
    const watches = new Map(p.watches.map((w) => [keyOf(w), w]));
    const ratings = new Map((p.ratings ?? []).map((r) => [r.season, r.rating]));
    return new TrackedSeries(p.userId, p.seriesId, p.status, watches, p.addedAt, p.savingTarget, ratings);
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

  get ratings(): Rating[] {
    return [...this._ratings].map(([season, rating]) => ({ season, rating }));
  }

  /** Out of 10; null when not rated. */
  ratingOf(season: number = WHOLE_SERIES): number | null {
    return this._ratings.get(season) ?? null;
  }

  /** Rates the whole Series (no `season`) or one season out of 10; a null `rating` clears it. */
  rate({ rating, season = WHOLE_SERIES }: { rating: number | null; season?: number }) {
    if (rating === null) this._ratings.delete(season);
    else if (isRating(rating)) this._ratings.set(season, rating);
    else throw new RangeError(`A rating is a whole number from 1 to 10, not ${rating}`);
  }

  /** Imported Ratings fill in what isn't rated yet: a Rating given in Snug wins. */
  mergeRatings(ratings: readonly Rating[]) {
    for (const r of ratings) if (!this._ratings.has(r.season)) this.rate(r);
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

  /** Ready with how many Episodes are out from the Next Episode on, dated, or TBA (no date, or nothing after the Progress). */
  airing(episodes: readonly (EpisodeRef & { airDate: string | null })[], today: string): Airing {
    const next = this.nextEpisode(episodes);
    if (!next?.airDate) return { kind: "tba" };
    if (!hasAired(next, today)) return { kind: "dated", date: next.airDate };
    const left = episodes.filter((e) => compareEpisodes(e, next) >= 0 && hasAired(e, today) && !this.hasWatched(e)).length;
    return { kind: "ready", left };
  }

  /**
   * New mode: the Next Episode aired in the last `days` days, after the last Watch, so you were caught up and
   * waiting for it. A Series being binged (last Watch after the air date) is not new.
   */
  isNew(episodes: readonly (EpisodeRef & { airDate: string | null })[], today: string, days: number) {
    const next = this.nextEpisode(episodes);
    const last = this.lastWatchedAt;
    if (!days || !next?.airDate || !last || !hasAired(next, today)) return false;
    return next.airDate >= addDays(today, -days) && dayOf(last) <= next.airDate;
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

export interface TrackedSeriesRepository {
  find(userId: string, seriesId: number): Promise<TrackedSeries | null>;
  listByUser(userId: string): Promise<TrackedSeries[]>;
  listBySeries(seriesId: number): Promise<TrackedSeries[]>;
  /** Distinct Series ids tracked by anyone with one of these Statuses. */
  seriesIdsWithStatus(statuses: readonly Status[]): Promise<number[]>;
  save(tracked: TrackedSeries): Promise<void>;
  delete(userId: string, seriesId: number): Promise<void>;
}
