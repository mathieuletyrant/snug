import {
  DEFAULT_PREFERENCES,
  type Home,
  type Numbered,
  type Preferences,
  type SavingTarget,
  type SeriesCard,
  type SeriesDetail,
  type WatchedNext,
} from "@snug/shared";
import { type Episode, numberAbsolutely, type Series } from "@/modules/catalog/domain/series";
import { today } from "@/shared/day";
import { NotFoundError } from "@/shared/errors";
import {
  STATUSES,
  compareEpisodes,
  type EpisodeRef,
  type Rating,
  type Status,
  TrackedSeries,
  type TrackedSeriesRepository,
  hasAired,
  type Watch,
} from "@/modules/tracking/domain/tracked-series";
import { t } from "@/shared/i18n";

/** What tracking needs from the Catalog. */
export interface CatalogPort {
  ensure(tmdbId: number): Promise<Series>;
  getMany(tmdbIds: readonly number[]): Promise<Map<number, Series>>;
}

export interface ImportEntry {
  seriesId: number;
  status: Status;
  watches: Watch[];
  ratings?: Rating[];
}

export class TrackingService {
  constructor(
    private readonly repo: TrackedSeriesRepository,
    private readonly catalog: CatalogPort,
    private readonly preferences: (userId: string) => Preferences = () => DEFAULT_PREFERENCES,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private readonly locks = new Map<string, Promise<unknown>>();

  // ---- Commands

  /** Starts tracking a Series, or changes its Status when already tracked. */
  async track(userId: string, seriesId: number, status: Status = "watching", savingTarget?: SavingTarget) {
    const series = await this.catalog.ensure(seriesId);
    await this.exclusive(userId, seriesId, async () => {
      const tracked =
        (await this.repo.find(userId, seriesId)) ?? TrackedSeries.start(userId, seriesId, status, this.now());
      tracked.choose(status, series, today(this.now()), savingTarget);
      await this.repo.save(tracked);
    });
  }

  /**
   * Puts a Series on the Watchlist unless it is already tracked: a Series being watched, paused or
   * completed keeps its Status. Returns the Status it ends with, and whether it was added.
   */
  async addToWatchlist(userId: string, seriesId: number): Promise<{ status: Status; added: boolean }> {
    await this.catalog.ensure(seriesId);
    return this.exclusive(userId, seriesId, async () => {
      const existing = await this.repo.find(userId, seriesId);
      if (existing) return { status: existing.status, added: false };
      await this.repo.save(TrackedSeries.start(userId, seriesId, "watchlist", this.now()));
      return { status: "watchlist" as const, added: true };
    });
  }

  untrack(userId: string, seriesId: number) {
    return this.exclusive(userId, seriesId, () => this.repo.delete(userId, seriesId));
  }

  /**
   * Starts tracking the Series as Watching if needed (media server events, Episode toggles on an untracked
   * Series). Returns the Next Episode, aired or not.
   */
  async watchEpisode(userId: string, seriesId: number, ep: EpisodeRef, at: Date = this.now()): Promise<Episode | null> {
    const series = await this.catalog.ensure(seriesId);
    return this.exclusive(userId, seriesId, async () => {
      const tracked =
        (await this.repo.find(userId, seriesId)) ?? TrackedSeries.start(userId, seriesId, "watching", this.now());
      tracked.watch(ep, at);
      await this.saveReconciled(tracked, series);
      return tracked.nextEpisode(series.episodes);
    });
  }

  /** Catch up: watches an Episode and every aired Episode before it not watched yet. */
  async watchThrough(userId: string, seriesId: number, ep: EpisodeRef) {
    const series = await this.catalog.ensure(seriesId);
    await this.exclusive(userId, seriesId, async () => {
      const tracked =
        (await this.repo.find(userId, seriesId)) ?? TrackedSeries.start(userId, seriesId, "watching", this.now());
      for (const earlier of this.aired(series).filter((episode) => compareEpisodes(episode, ep) < 0)) tracked.watch(earlier, this.now());
      tracked.watch(ep, this.now());
      await this.saveReconciled(tracked, series);
    });
  }

  /** `restore` puts back the Status a Watch moved (undoing `watchNext` on a Saving up or Paused Series). */
  async unwatchEpisode(userId: string, seriesId: number, ep: EpisodeRef, restore?: Status) {
    const series = await this.catalog.ensure(seriesId);
    await this.exclusive(userId, seriesId, async () => {
      const tracked = await this.get(userId, seriesId);
      tracked.unwatch(ep);
      if (restore) tracked.choose(restore, series, today(this.now()));
      await this.saveReconciled(tracked, series);
    });
  }

  /** The home screen's one click. Returns the Episode marked and the Status before, so it can be undone. */
  async watchNext(userId: string, seriesId: number): Promise<WatchedNext> {
    const series = await this.catalog.ensure(seriesId);
    return this.exclusive(userId, seriesId, async () => {
      const tracked = await this.get(userId, seriesId);
      const next = tracked.nextEpisode(this.aired(series));
      if (!next) throw new NotFoundError(t().errors.nothingToWatch);
      const previousStatus = tracked.status;
      tracked.watch(next, this.now());
      await this.saveReconciled(tracked, series);
      return { ...numberAbsolutely(series.episodes)(next), previousStatus };
    });
  }

  /** Rates a tracked Series (no `season`) or one of its seasons out of 10; a null `rating` clears it. */
  async rate(userId: string, seriesId: number, rate: { rating: number | null; season?: number }) {
    await this.exclusive(userId, seriesId, async () => {
      const tracked = await this.get(userId, seriesId);
      tracked.rate(rate);
      await this.repo.save(tracked);
    });
  }

  /** Absolute numbering on or off for a tracked Series. */
  async numberAbsolutely(userId: string, seriesId: number, on: boolean) {
    await this.exclusive(userId, seriesId, async () => {
      const tracked = await this.get(userId, seriesId);
      tracked.numberAbsolutely(on);
      await this.repo.save(tracked);
    });
  }

  async watchSeason(userId: string, seriesId: number, season: number) {
    const series = await this.catalog.ensure(seriesId);
    await this.exclusive(userId, seriesId, async () => {
      const tracked =
        (await this.repo.find(userId, seriesId)) ?? TrackedSeries.start(userId, seriesId, "watching", this.now());
      for (const ep of this.aired(series).filter((episode) => episode.season === season)) tracked.watch(ep, this.now());
      await this.saveReconciled(tracked, series);
    });
  }

  /** Merges imported Series and Watches; existing Statuses win. Returns the Series ids to fetch into the Catalog. */
  async import(userId: string, entries: ImportEntry[]): Promise<number[]> {
    for (const entry of entries) {
      await this.exclusive(userId, entry.seriesId, async () => {
        const tracked =
          (await this.repo.find(userId, entry.seriesId)) ??
          TrackedSeries.start(userId, entry.seriesId, entry.status, this.now());
        tracked.merge(entry.watches);
        tracked.mergeRatings(entry.ratings ?? []);
        await this.repo.save(tracked);
      });
    }
    return entries.map((entry) => entry.seriesId);
  }

  /** Re-applies the Completed rule for everyone tracking a Series, e.g. after a Catalog refresh. */
  async reconcileSeries(seriesId: number) {
    const series = (await this.catalog.getMany([seriesId])).get(seriesId);
    if (!series) return;
    for (const { userId } of await this.repo.listBySeries(seriesId)) {
      await this.exclusive(userId, seriesId, async () => {
        const tracked = await this.repo.find(userId, seriesId);
        if (!tracked) return;
        const before = tracked.status;
        tracked.reconcile(series, today(this.now()));
        if (tracked.status !== before) await this.repo.save(tracked);
      });
    }
  }

  // ---- Queries

  async home(userId: string): Promise<Home> {
    const list = (await this.repo.listByUser(userId)).filter((tracked) => tracked.status === "watching" || tracked.status === "saving");
    const cards = await this.cards(userId, list);
    const ready = cards.filter((card) => card.ready);
    const hideUndated = this.preferences(userId).hideUndatedUpcoming;
    const upcoming = cards.filter((card) => !ready.includes(card) && (!hideUndated || !card.loaded || card.next?.airDate));
    // Fresh Episodes first (New mode), then Saved up, then the most recently watched.
    ready.sort(
      (a, b) =>
        Number(b.fresh) - Number(a.fresh) ||
        Number(!!b.saving) - Number(!!a.saving) ||
        (b.lastWatchedAt ?? "").localeCompare(a.lastWatchedAt ?? ""),
    );
    upcoming.sort((a, b) => (a.next?.airDate ?? "9999").localeCompare(b.next?.airDate ?? "9999"));
    return { ready, upcoming };
  }

  async library(userId: string): Promise<SeriesCard[]> {
    const cards = await this.cards(userId, await this.repo.listByUser(userId));
    return cards.sort((a, b) => a.name.localeCompare(b.name));
  }

  async detail(userId: string, seriesId: number): Promise<SeriesDetail> {
    const [series, found] = await Promise.all([this.catalog.ensure(seriesId), this.repo.find(userId, seriesId)]);
    const tracked = found ?? TrackedSeries.start(userId, seriesId, "watchlist", this.now());
    const day = today(this.now());
    const numbered = numberAbsolutely(series.episodes);
    const seasons = new Map<number, SeriesDetail["seasons"][number]>();
    for (const episode of series.episodes) {
      const season = seasons.get(episode.season) ?? { number: episode.season, rating: tracked.ratingOf(episode.season), episodes: [] };
      season.episodes.push({
        ...numbered(episode),
        watched: tracked.hasWatched(episode),
        watchedAt: tracked.watchedAt(episode)?.toISOString() ?? null,
        aired: hasAired(episode, day),
      });
      seasons.set(episode.season, season);
    }
    const { loaded: _, ...card } = this.card(tracked, series, this.preferences(userId).newForDays);
    return {
      ...card,
      tracked: !!found,
      overview: series.overview,
      ended: series.ended,
      seasons: [...seasons.values()],
    };
  }

  /**
   * The Episodes of the User's Watching and Saving up Series airing from `from` to `to` (both included), by air
   * date: what the calendar Feed and the Assistant's calendar show.
   */
  async airing(
    userId: string,
    from: string,
    to = "9999-12-31",
  ): Promise<
    { series: Series; episode: Numbered<Episode> & { airDate: string }; absoluteNumbering: boolean; watchedAt: Date | null; next: boolean }[]
  > {
    const list = (await this.repo.listByUser(userId)).filter((tracked) => tracked.status === "watching" || tracked.status === "saving");
    const catalog = await this.catalog.getMany(list.map((tracked) => tracked.seriesId));
    const found = [];
    for (const tracked of list) {
      const series = catalog.get(tracked.seriesId);
      if (!series) continue;
      const next = tracked.nextEpisode(series.episodes);
      const numbered = numberAbsolutely(series.episodes);
      for (const episode of series.episodes) {
        if (!episode.airDate || episode.airDate < from || episode.airDate > to) continue;
        found.push({
          series,
          episode: { ...numbered(episode), airDate: episode.airDate },
          absoluteNumbering: tracked.absoluteNumbering,
          watchedAt: tracked.watchedAt(episode),
          next: episode === next,
        });
      }
    }
    return found.sort((a, b) => a.episode.airDate.localeCompare(b.episode.airDate));
  }

  /** For every User, the un-watched Episodes of their Watching Series that air on one of these days. */
  async newEpisodesOn(
    days: readonly string[],
  ): Promise<{ userId: string; series: Series; episodes: Numbered<Episode>[]; absoluteNumbering: boolean }[]> {
    const ids = [...new Set(await this.repo.seriesIdsWithStatus(["watching"]))];
    const catalog = await this.catalog.getMany(ids);
    const found = [];
    for (const id of ids) {
      const series = catalog.get(id);
      if (!series) continue;
      const airing = series.episodes
        .filter((episode) => episode.airDate !== null && days.includes(episode.airDate))
        .map(numberAbsolutely(series.episodes));
      if (!airing.length) continue;
      for (const tracked of await this.repo.listBySeries(id)) {
        if (tracked.status !== "watching") continue;
        const episodes = airing.filter((episode) => !tracked.hasWatched(episode));
        if (episodes.length) found.push({ userId: tracked.userId, series, episodes, absoluteNumbering: tracked.absoluteNumbering });
      }
    }
    return found;
  }

  /** Ids of the Series the User reads with Absolute numbering. */
  async absolutelyNumbered(userId: string): Promise<Set<number>> {
    return new Set((await this.repo.listByUser(userId)).filter((tracked) => tracked.absoluteNumbering).map((tracked) => tracked.seriesId));
  }

  /** Series ids tracked with one of these Statuses. */
  async seriesIdsWithStatus(userId: string, statuses: readonly Status[]): Promise<number[]> {
    return (await this.repo.listByUser(userId)).filter((tracked) => statuses.includes(tracked.status)).map((tracked) => tracked.seriesId);
  }

  // ---- Helpers

  /**
   * One read-modify-write at a time per TrackedSeries: `save` rewrites every Watch, so two overlapping ones
   * (a Jellyfin burst, an Import, a click) would lose Watches.
   * ponytail: in-process lock, fine for one server; a version column if Snug ever runs several.
   */
  private exclusive<T>(userId: string, seriesId: number, fn: () => Promise<T>): Promise<T> {
    const key = `${userId}:${seriesId}`;
    const run = (this.locks.get(key) ?? Promise.resolve()).then(fn);
    const tail = run.catch(() => {});
    this.locks.set(key, tail);
    void tail.then(() => this.locks.get(key) === tail && this.locks.delete(key));
    return run;
  }

  private async get(userId: string, seriesId: number) {
    const tracked = await this.repo.find(userId, seriesId);
    if (!tracked) throw new NotFoundError(t().errors.notTracked);
    return tracked;
  }

  private aired(series: Series, day = today(this.now())) {
    return series.episodes.filter((episode) => hasAired(episode, day));
  }

  private async saveReconciled(tracked: TrackedSeries, series: Series) {
    tracked.reconcile(series, today(this.now()));
    await this.repo.save(tracked);
  }

  private async cards(userId: string, list: TrackedSeries[]): Promise<SeriesCard[]> {
    const catalog = await this.catalog.getMany(list.map((tracked) => tracked.seriesId));
    const { newForDays } = this.preferences(userId);
    return list.map((tracked) => this.card(tracked, catalog.get(tracked.seriesId), newForDays));
  }

  private card(t: TrackedSeries, series: Series | undefined, newForDays: number): SeriesCard {
    const day = today(this.now());
    const aired = series ? this.aired(series, day) : [];
    const onDay = series
      ? t.onDay(series, day, newForDays)
      : { next: null, ready: false, airing: { kind: "tba" } as const, saving: null, fresh: false, choosable: [...STATUSES] };
    const numbered = numberAbsolutely(series?.episodes ?? []);
    const runtimes = (series?.episodes ?? []).flatMap((episode) => (episode.runtime ? [episode.runtime] : []));
    const average = runtimes.length ? runtimes.reduce((sum, runtime) => sum + runtime, 0) / runtimes.length : 0;
    return {
      seriesId: t.seriesId,
      loaded: !!series,
      name: series?.name ?? `Series #${t.seriesId}`,
      year: series?.year ?? null,
      posterPath: series?.posterPath ?? null,
      backdropPath: series?.backdropPath ?? null,
      status: t.status,
      ...onDay,
      next: onDay.next && numbered(onDay.next),
      absoluteNumbering: t.absoluteNumbering,
      progress: t.progress && numbered(t.progress),
      watchedCount: aired.filter((episode) => t.hasWatched(episode)).length,
      airedCount: aired.length,
      rating: t.ratingOf(),
      minutesLeft: Math.round(aired.filter((episode) => !t.hasWatched(episode)).reduce((sum, episode) => sum + (episode.runtime ?? average), 0)),
      lastWatchedAt: t.lastWatchedAt?.toISOString() ?? null,
    };
  }
}
