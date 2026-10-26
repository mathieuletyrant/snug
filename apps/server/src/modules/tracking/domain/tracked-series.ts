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
/** Aired: the air date is today or earlier, `today` being the instance's day (see `shared/day.ts`). */
export const hasAired = (e: { airDate: string | null }, today: string) => e.airDate !== null && e.airDate <= today;

type Dated = EpisodeRef & { airDate: string | null };

/** A TrackedSeries on a Day (see `TrackedSeries.onDay`); the words are the GLOSSARY's. */
export interface OnDay<E extends Dated> {
  next: E | null;
  /** Watching with the Next Episode aired, or Saving up with enough saved; always false for other Statuses. */
  ready: boolean;
  airing: Airing;
  /** Saving up only. */
  saving: Saving | null;
  /** New: Ready, and the Next Episode aired lately while the User was caught up and waiting for it. */
  fresh: boolean;
  choosable: Status[];
}

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
    private _absoluteNumbering = false,
  ) {}

  static start(userId: string, seriesId: number, status: Status, now: Date, savingTarget: SavingTarget = 0, absoluteNumbering = false) {
    return new TrackedSeries(userId, seriesId, status, new Map(), now, savingTarget, new Map(), absoluteNumbering);
  }

  static restore(p: {
    userId: string;
    seriesId: number;
    status: Status;
    watches: Watch[];
    addedAt: Date;
    savingTarget: SavingTarget;
    ratings?: Rating[];
    absoluteNumbering?: boolean;
  }) {
    const watches = new Map(p.watches.map((watch) => [keyOf(watch), watch]));
    const ratings = new Map((p.ratings ?? []).map((rating) => [rating.season, rating.rating]));
    return new TrackedSeries(p.userId, p.seriesId, p.status, watches, p.addedAt, p.savingTarget, ratings, p.absoluteNumbering);
  }

  get status() {
    return this._status;
  }

  get savingTarget() {
    return this._savingTarget;
  }

  /** Absolute numbering: the User reads this Series' Episodes by their Absolute number ("Ep. 1156"). */
  get absoluteNumbering() {
    return this._absoluteNumbering;
  }

  numberAbsolutely(on: boolean) {
    this._absoluteNumbering = on;
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
    for (const rating of ratings) if (!this._ratings.has(rating.season)) this.rate(rating);
  }

  hasWatched(ep: EpisodeRef) {
    return this._watches.has(keyOf(ep));
  }

  /** When the Episode was first watched; null when not watched. */
  watchedAt(ep: EpisodeRef): Date | null {
    return this._watches.get(keyOf(ep))?.watchedAt ?? null;
  }

  /** Watching again pulls a Paused, Saving up or Watchlist Series back to Watching; Dropped stays Dropped. */
  watch(ep: EpisodeRef, at: Date) {
    this.add(ep, at);
    if (this._status === "paused" || this._status === "saving" || this._status === "watchlist") this._status = "watching";
  }

  /** Imported Watches merge in without moving the Status: an imported Paused Series stays Paused. */
  merge(watches: readonly Watch[]) {
    for (const watch of watches) this.add(watch, watch.watchedAt);
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

  /** Furthest Episode watched, regardless of rewatches. */
  get progress(): EpisodeRef | null {
    let furthest: EpisodeRef | null = null;
    for (const watch of this._watches.values()) if (!furthest || compareEpisodes(watch, furthest) > 0) furthest = watch;
    return furthest && { season: furthest.season, number: furthest.number };
  }

  get lastWatchedAt(): Date | null {
    let last: Date | null = null;
    for (const watch of this._watches.values()) if (!last || watch.watchedAt > last) last = watch.watchedAt;
    return last;
  }

  /** First un-watched Episode after the Progress. */
  nextEpisode<E extends EpisodeRef>(episodes: readonly E[]): E | null {
    return this.nextIn([...episodes].sort(compareEpisodes));
  }

  /**
   * The Series on a Day: its Next Episode, whether it is Ready, how it airs, how far its saving
   * up is, whether it is New, and the Statuses the User can pick. Episodes are sorted once for all of them.
   */
  onDay<E extends Dated>(timeline: { ended: boolean; episodes: readonly E[] }, today: string, newForDays = 0): OnDay<E> {
    const sorted = [...timeline.episodes].sort(compareEpisodes);
    const next = this.nextIn(sorted);
    // The Episodes from the Next Episode on, not watched yet.
    const ahead = next ? sorted.filter((episode) => compareEpisodes(episode, next) >= 0 && !this.hasWatched(episode)) : [];
    const airing: Airing = !next?.airDate
      ? { kind: "tba" }
      : hasAired(next, today)
        ? { kind: "ready", left: ahead.filter((episode) => hasAired(episode, today)).length }
        : { kind: "dated", date: next.airDate };
    const saving = this._status === "saving" ? this.saving(next, ahead, today) : null;
    const ready =
      (this._status === "watching" || this._status === "saving") && (saving ? saving.reached : airing.kind === "ready");
    return { next, ready, airing, saving, fresh: ready && this.isNew(next, today, newForDays), choosable: this.choosable(timeline, today) };
  }

  private nextIn<E extends EpisodeRef>(sorted: readonly E[]): E | null {
    const progress = this.progress;
    return sorted.find((episode) => (!progress || compareEpisodes(episode, progress) > 0) && !this.hasWatched(episode)) ?? null;
  }

  /** A full season counts the Next Episode's season as TMDB lists it; a number counts across seasons. */
  private saving(next: Dated | null, ahead: readonly Dated[], today: string): Saving {
    if (this._savingTarget === 0) {
      const season = ahead.filter((episode) => episode.season === next?.season);
      return {
        target: 0,
        out: season.filter((episode) => hasAired(episode, today)).length,
        needed: season.length,
        reached: season.length > 0 && season.every((episode) => hasAired(episode, today)),
        completeOn: season.at(-1)?.airDate ?? null,
      };
    }
    const out = ahead.filter((episode) => hasAired(episode, today)).length;
    return {
      target: this._savingTarget,
      out,
      needed: this._savingTarget,
      reached: out >= this._savingTarget,
      completeOn: ahead[this._savingTarget - 1]?.airDate ?? null,
    };
  }

  /** The Next Episode aired in the last `days` days, after the last Watch: a Series being binged is not new. */
  private isNew(next: Dated | null, today: string, days: number) {
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
  private choosable(timeline: Timeline, today: string): Status[] {
    const done = this.done(timeline, today);
    return STATUSES.filter((status) => done === null || settle(status, done) === status);
  }

  /** Whether the Series has ended with nothing aired left after the Progress; null before the Catalog knows its Episodes. */
  private done(timeline: Timeline, today: string) {
    if (!timeline.episodes.length) return null;
    return timeline.ended && !this.nextEpisode(timeline.episodes.filter((episode) => hasAired(episode, today)));
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
