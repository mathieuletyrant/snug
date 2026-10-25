/** Catalog: shared, read-only metadata about Series, sourced from TMDB. */

import type { Episode, EpisodeRef, Numbered, SeriesSummary } from "@snug/shared";

export type { Episode, SeriesSummary };

export interface Series {
  tmdbId: number;
  /** TheTVDB id, what Sonarr identifies series by; null when TMDB doesn't know it. */
  tvdbId: number | null;
  name: string;
  year: number | null;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  /** Ended or canceled: no new Episodes expected. */
  ended: boolean;
  /** Regular seasons only; specials (season 0) are not tracked. */
  episodes: Episode[];
  fetchedAt: Date;
}

/**
 * Gives Episodes their Absolute number (see GLOSSARY). TMDB numbers some Series across seasons already (One
 * Piece's season 23 starts at 1156) and others from 1 in every season: a season whose first number is past the
 * Episodes before it keeps its numbers, any other one counts on from them. `all` is every Episode of the Series.
 */
export function numberAbsolutely(all: readonly EpisodeRef[]) {
  const seasons = new Map<number, { first: number; count: number }>();
  for (const episode of all) {
    const season = seasons.get(episode.season);
    if (season) {
      season.first = Math.min(season.first, episode.number);
      season.count++;
    } else seasons.set(episode.season, { first: episode.number, count: 1 });
  }
  const offsets = new Map<number, number>();
  let before = 0;
  for (const [number, season] of [...seasons].sort(([a], [b]) => a - b)) {
    offsets.set(number, season.first > before ? 0 : before);
    before += season.count;
  }
  return <E extends EpisodeRef>(episode: E): Numbered<E> => ({ ...episode, absolute: episode.number + (offsets.get(episode.season) ?? 0) });
}

/** Hints a third party (e.g. a media server) gives about which Series an Episode belongs to. */
export interface SeriesHint {
  tmdbId?: number;
  tvdbEpisodeId?: string;
  imdbEpisodeId?: string;
  title?: string;
  year?: number;
}

export interface CatalogRepository {
  get(tmdbId: number): Promise<Series | null>;
  getMany(tmdbIds: readonly number[]): Promise<Map<number, Series>>;
  save(series: Series): Promise<void>;
  setTvdbId(tmdbId: number, tvdbId: number | null): Promise<void>;
  /** Ids among `tmdbIds` never fetched or fetched before `before`. */
  stale(tmdbIds: readonly number[], before: Date): Promise<number[]>;
}

/** Where Series metadata comes from (TMDB). */
export interface SeriesSource {
  fetch(tmdbId: number): Promise<Series>;
  tvdbId(tmdbId: number): Promise<number | null>;
  search(query: string): Promise<SeriesSummary[]>;
  /** Series id owning an Episode known by an external id. */
  findByEpisode(externalId: string, source: "tvdb_id" | "imdb_id"): Promise<number | null>;
}
