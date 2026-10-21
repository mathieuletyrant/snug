import type { Home, SeriesCard, SeriesDetail } from "@snug/shared";
import type { Episode, Series } from "../../catalog/domain/series";
import { today } from "../../../shared/async";
import { NotFoundError } from "../../../shared/errors";
import {
  availability,
  type EpisodeRef,
  type Status,
  TrackedSeries,
  type TrackedSeriesRepository,
  type Watch,
} from "../domain/tracked-series";

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

  // ---- Commands

  /** Starts tracking a Series, or changes its Status when already tracked. */
  async track(userId: string, seriesId: number, status: Status = "watching") {
    await this.catalog.ensure(seriesId);
    const tracked = (await this.repo.find(userId, seriesId)) ?? TrackedSeries.start(userId, seriesId, status, this.now());
    tracked.changeStatus(status);
    await this.repo.save(tracked);
  }

  untrack(userId: string, seriesId: number) {
    return this.repo.delete(userId, seriesId);
  }

  /** Starts tracking the Series as Watching if needed (media server events, Episode toggles on an untracked Series). */
  async watchEpisode(userId: string, seriesId: number, ep: EpisodeRef, at: Date = this.now()) {
    const series = await this.catalog.ensure(seriesId);
    const tracked =
      (await this.repo.find(userId, seriesId)) ?? TrackedSeries.start(userId, seriesId, "watching", this.now());
    tracked.watch(ep, at);
    await this.saveReconciled(tracked, series);
  }

  async unwatchEpisode(userId: string, seriesId: number, ep: EpisodeRef) {
    const [tracked, series] = await Promise.all([this.get(userId, seriesId), this.catalog.ensure(seriesId)]);
    tracked.unwatch(ep);
    await this.saveReconciled(tracked, series);
  }

  /** The home screen's one click. Returns the Episode marked, so it can be undone. */
  async watchNext(userId: string, seriesId: number): Promise<Episode> {
    const [tracked, series] = await Promise.all([this.get(userId, seriesId), this.catalog.ensure(seriesId)]);
    const next = tracked.nextEpisode(this.aired(series));
    if (!next) throw new NotFoundError("No aired Episode left to watch");
    tracked.watch(next, this.now());
    await this.saveReconciled(tracked, series);
    return next;
  }

  async watchSeason(userId: string, seriesId: number, season: number) {
    const series = await this.catalog.ensure(seriesId);
    const tracked =
      (await this.repo.find(userId, seriesId)) ?? TrackedSeries.start(userId, seriesId, "watching", this.now());
    for (const ep of this.aired(series).filter((e) => e.season === season)) tracked.watch(ep, this.now());
    await this.saveReconciled(tracked, series);
  }

  /** Merges imported Series and Watches; existing Statuses win. Returns the Series ids to fetch into the Catalog. */
  async import(userId: string, entries: ImportEntry[]): Promise<number[]> {
    for (const entry of entries) {
      const existing = await this.repo.find(userId, entry.seriesId);
      const tracked = existing ?? TrackedSeries.start(userId, entry.seriesId, entry.status, this.now());
      const status = tracked.status;
      for (const w of entry.watches) tracked.watch(w, w.watchedAt);
      tracked.changeStatus(status);
      await this.repo.save(tracked);
    }
    return entries.map((e) => e.seriesId);
  }

  /** Re-applies the Completed rule for everyone tracking a Series, e.g. after a Catalog refresh. */
  async reconcileSeries(seriesId: number) {
    const series = (await this.catalog.getMany([seriesId])).get(seriesId);
    if (!series) return;
    for (const tracked of await this.repo.listBySeries(seriesId)) {
      const before = tracked.status;
      tracked.reconcile(series, today(this.now()));
      if (tracked.status !== before) await this.repo.save(tracked);
    }
  }

  // ---- Queries

  async home(userId: string): Promise<Home> {
    const watching = (await this.repo.listByUser(userId)).filter((t) => t.status === "watching");
    const cards = await this.cards(watching);
    const ready = cards.filter((c) => c.loaded && availability(c.next, today(this.now())) === "ready");
    const upcoming = cards.filter((c) => !ready.includes(c));
    ready.sort((a, b) => (b.lastWatchedAt ?? "").localeCompare(a.lastWatchedAt ?? ""));
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

  /** Series ids tracked with one of these Statuses. */
  async seriesIdsWithStatus(userId: string, statuses: readonly Status[]): Promise<number[]> {
    return (await this.repo.listByUser(userId)).filter((t) => statuses.includes(t.status)).map((t) => t.seriesId);
  }

  // ---- Helpers

  private async get(userId: string, seriesId: number) {
    const tracked = await this.repo.find(userId, seriesId);
    if (!tracked) throw new NotFoundError("Series is not tracked");
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
      progress: t.progress,
      next: series ? t.nextEpisode(series.episodes) : null,
      watchedCount: aired.filter((e) => t.hasWatched(e)).length,
      airedCount: aired.length,
      lastWatchedAt: t.lastWatchedAt?.toISOString() ?? null,
    };
  }
}
