import { forEachLimit } from "../../../shared/async";
import type { CatalogRepository, Series, SeriesHint, SeriesSource, SeriesSummary } from "../domain/series";

const DAY = 24 * 60 * 60 * 1000;

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

  /** Refreshes Series older than `maxAgeDays`, calling `onRefreshed` for each one. */
  async refreshStale(tmdbIds: readonly number[], maxAgeDays: number, onRefreshed: (id: number) => Promise<unknown>) {
    const stale = await this.repo.stale(tmdbIds, new Date(this.now().getTime() - maxAgeDays * DAY));
    await forEachLimit(stale, 4, async (id) => {
      await this.refresh(id);
      await onRefreshed(id);
    });
    return stale.length;
  }

  /**
   * TheTVDB ids of cached Series; ones fetched before ids were stored are looked up once on TMDB.
   * ponytail: a Series TMDB has no TVDB id for is looked up again on every call; cache "none" if lists get big.
   */
  async tvdbIds(tmdbIds: readonly number[]): Promise<Map<number, number | null>> {
    const cached = await this.repo.getMany(tmdbIds);
    const result = new Map([...cached.values()].map((s) => [s.tmdbId, s.tvdbId]));
    const missing = [...cached.values()].filter((s) => s.tvdbId === null).map((s) => s.tmdbId);
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
    const exact = results.filter((r) => r.name.toLowerCase() === hint.title?.toLowerCase());
    const pool = exact.length ? exact : results;
    return (pool.find((r) => hint.year && r.year === hint.year) ?? pool[0])?.tmdbId ?? null;
  }
}
