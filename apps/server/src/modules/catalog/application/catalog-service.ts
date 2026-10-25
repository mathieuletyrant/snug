import { forEachLimit } from "@/shared/async";
import { moduleLogger, reason } from "@/shared/logger";
import type { CatalogRepository, Series, SeriesHint, SeriesSource, SeriesSummary } from "@/modules/catalog/domain/series";

const DAY = 24 * 60 * 60 * 1000;
const log = moduleLogger("catalog");

export class CatalogService {
  constructor(
    private readonly repo: CatalogRepository,
    private readonly source: SeriesSource,
    private readonly now: () => Date = () => new Date(),
  ) {}

  getMany(tmdbIds: readonly number[]): Promise<Map<number, Series>> {
    return this.repo.getMany(tmdbIds);
  }

  /** Cached Series, fetched from the source on first use. */
  async ensure(tmdbId: number): Promise<Series> {
    return (await this.repo.get(tmdbId)) ?? this.refresh(tmdbId);
  }

  async refresh(tmdbId: number): Promise<Series> {
    const series = await this.source.fetch(tmdbId);
    await this.repo.save(series);
    return series;
  }

  /** Refreshes Series older than `maxAgeDays`, calling `onRefreshed` for each one. A failure skips that Series only. */
  async refreshStale(tmdbIds: readonly number[], maxAgeDays: number, onRefreshed: (id: number) => Promise<unknown>) {
    const stale = await this.repo.stale(tmdbIds, new Date(this.now().getTime() - maxAgeDays * DAY));
    let failed = 0;
    await forEachLimit(
      stale,
      4,
      async (id) => {
        await this.refresh(id);
        await onRefreshed(id);
      },
      (id, error) => {
        failed++;
        log.warn(`Could not refresh series ${id}: ${reason(error)}`);
      },
    );
    return { refreshed: stale.length - failed, failed };
  }

  /**
   * TheTVDB ids of cached Series; ones fetched before ids were stored are looked up once on TMDB.
   * ponytail: a Series TMDB has no TVDB id for is looked up again on every call; cache "none" if lists get big.
   */
  async tvdbIds(tmdbIds: readonly number[]): Promise<Map<number, number | null>> {
    const cached = await this.repo.getMany(tmdbIds);
    const result = new Map([...cached.values()].map((entry) => [entry.tmdbId, entry.tvdbId]));
    const missing = [...cached.values()].filter((entry) => entry.tvdbId === null).map((entry) => entry.tmdbId);
    await forEachLimit(missing, 4, async (id) => {
      const tvdbId = await this.source.tvdbId(id);
      result.set(id, tvdbId);
      if (tvdbId) await this.repo.setTvdbId(id, tvdbId);
    });
    return result;
  }

  search(query: string): Promise<SeriesSummary[]> {
    return this.source.search(query);
  }

  /** Best effort: which Series a hint points to, from most to least reliable signal. */
  async resolve(hint: SeriesHint): Promise<number | null> {
    if (hint.tmdbId) return hint.tmdbId;
    if (hint.tvdbEpisodeId) {
      const id = await this.source.findByEpisode(hint.tvdbEpisodeId, "tvdb_id");
      if (id) return id;
    }
    if (hint.imdbEpisodeId) {
      const id = await this.source.findByEpisode(hint.imdbEpisodeId, "imdb_id");
      if (id) return id;
    }
    if (!hint.title) return null;
    const results = await this.source.search(hint.title);
    const exact = results.filter((result) => result.name.toLowerCase() === hint.title?.toLowerCase());
    const pool = exact.length ? exact : results;
    return (pool.find((result) => hint.year && result.year === hint.year) ?? pool[0])?.tmdbId ?? null;
  }
}
