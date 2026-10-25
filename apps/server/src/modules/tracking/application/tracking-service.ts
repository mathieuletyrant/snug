import type { Home, SavingTarget, SeriesCard, SeriesDetail, WatchedNext } from "@snug/shared";
import type { Episode, Series } from "@/modules/catalog/domain/series";
import { today } from "@/shared/async";
import { NotFoundError } from "@/shared/errors";
import {
  STATUSES,
  availability,
  compareEpisodes,
  type EpisodeRef,
  type Status,
  TrackedSeries,
  type TrackedSeriesRepository,
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
}

export class TrackingService {
  constructor(
    private readonly repo: TrackedSeriesRepository,
    private readonly catalog: CatalogPort,
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
      for (const earlier of this.aired(series).filter((e) => compareEpisodes(e, ep) < 0)) tracked.watch(earlier, this.now());
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
      return { ...next, previousStatus };
    });
  }

  async watchSeason(userId: string, seriesId: number, season: number) {
    const series = await this.catalog.ensure(seriesId);
    await this.exclusive(userId, seriesId, async () => {
      const tracked =
        (await this.repo.find(userId, seriesId)) ?? TrackedSeries.start(userId, seriesId, "watching", this.now());
      for (const ep of this.aired(series).filter((e) => e.season === season)) tracked.watch(ep, this.now());
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
        await this.repo.save(tracked);
      });
    }
    return entries.map((e) => e.seriesId);
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
    const list = (await this.repo.listByUser(userId)).filter((t) => t.status === "watching" || t.status === "saving");
    const cards = await this.cards(list);
    // Saving up: Ready only once enough is out, and then first; until then, in Upcoming.
    const isReady = (c: SeriesCard) =>
      c.loaded && (c.saving ? c.saving.reached : availability(c.next, today(this.now())) === "ready");
    const ready = cards.filter(isReady);
    const upcoming = cards.filter((c) => !ready.includes(c));
    ready.sort(
      (a, b) =>
        Number(!!b.saving) - Number(!!a.saving) || (b.lastWatchedAt ?? "").localeCompare(a.lastWatchedAt ?? ""),
    );
    upcoming.sort((a, b) => (a.next?.airDate ?? "9999").localeCompare(b.next?.airDate ?? "9999"));
    return { ready, upcoming };
  }

  async library(userId: string): Promise<SeriesCard[]> {
    const cards = await this.cards(await this.repo.listByUser(userId));
    return cards.sort((a, b) => a.name.localeCompare(b.name));
  }

  async detail(userId: string, seriesId: number): Promise<SeriesDetail> {
    const [series, found] = await Promise.all([this.catalog.ensure(seriesId), this.repo.find(userId, seriesId)]);
    const tracked = found ?? TrackedSeries.start(userId, seriesId, "watchlist", this.now());
    const day = today(this.now());
    const seasons = new Map<number, SeriesDetail["seasons"][number]>();
    for (const e of series.episodes) {
      const season = seasons.get(e.season) ?? { number: e.season, episodes: [] };
      season.episodes.push({ ...e, watched: tracked.hasWatched(e), aired: e.airDate !== null && e.airDate <= day });
      seasons.set(e.season, season);
    }
    const { loaded: _, ...card } = this.card(tracked, series);
    return {
      ...card,
      tracked: !!found,
      overview: series.overview,
      ended: series.ended,
      seasons: [...seasons.values()],
    };
  }

  /** For every User, the un-watched Episodes of their Watching Series that air on one of these days. */
  async newEpisodesOn(days: readonly string[]): Promise<{ userId: string; series: Series; episodes: Episode[] }[]> {
    const ids = [...new Set(await this.repo.seriesIdsWithStatus(["watching"]))];
    const catalog = await this.catalog.getMany(ids);
    const found = [];
    for (const id of ids) {
      const series = catalog.get(id);
      if (!series) continue;
      const airing = series.episodes.filter((e) => e.airDate !== null && days.includes(e.airDate));
      if (!airing.length) continue;
      for (const tracked of await this.repo.listBySeries(id)) {
        if (tracked.status !== "watching") continue;
        const episodes = airing.filter((e) => !tracked.hasWatched(e));
        if (episodes.length) found.push({ userId: tracked.userId, series, episodes });
      }
    }
    return found;
  }

  /** Series ids tracked with one of these Statuses. */
  async seriesIdsWithStatus(userId: string, statuses: readonly Status[]): Promise<number[]> {
    return (await this.repo.listByUser(userId)).filter((t) => statuses.includes(t.status)).map((t) => t.seriesId);
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

  private aired(series: Series) {
    const day = today(this.now());
    return series.episodes.filter((e) => e.airDate !== null && e.airDate <= day);
  }

  private async saveReconciled(tracked: TrackedSeries, series: Series) {
    tracked.reconcile(series, today(this.now()));
    await this.repo.save(tracked);
  }

  private async cards(list: TrackedSeries[]): Promise<SeriesCard[]> {
    const catalog = await this.catalog.getMany(list.map((t) => t.seriesId));
    return list.map((t) => this.card(t, catalog.get(t.seriesId)));
  }

  private card(t: TrackedSeries, series: Series | undefined): SeriesCard {
    const aired = series ? this.aired(series) : [];
    return {
      seriesId: t.seriesId,
      loaded: !!series,
      name: series?.name ?? `Series #${t.seriesId}`,
      year: series?.year ?? null,
      posterPath: series?.posterPath ?? null,
      backdropPath: series?.backdropPath ?? null,
      status: t.status,
      choosable: series ? t.choosable(series, today(this.now())) : [...STATUSES],
      saving: series && t.status === "saving" ? t.saving(series.episodes, today(this.now())) : null,
      progress: t.progress,
      next: series ? t.nextEpisode(series.episodes) : null,
      watchedCount: aired.filter((e) => t.hasWatched(e)).length,
      airedCount: aired.length,
      lastWatchedAt: t.lastWatchedAt?.toISOString() ?? null,
    };
  }
}
