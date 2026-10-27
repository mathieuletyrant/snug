import { moduleLogger } from "@/shared/logger";
import { airDateHere, releaseOf } from "@/modules/catalog/domain/air-date";
import type { Episode, Series, SeriesSource, SeriesSummary } from "@/modules/catalog/domain/series";

const log = moduleLogger("tmdb");

const BASE = "https://api.themoviedb.org/3";
/** TMDB caps `append_to_response` at 20 sub-requests. */
const SEASONS_PER_CALL = 20;

class TmdbError extends Error {
  constructor(readonly status: number, path: string) {
    super(`TMDB ${status} on ${path}`);
  }
}

interface TmdbShow {
  id: number;
  name: string;
  overview: string;
  first_air_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  status: string;
  networks: { name: string }[];
  origin_country: string[];
  seasons: { season_number: number }[];
  external_ids?: { tvdb_id: number | null };
  [appended: `season/${number}`]: { episodes: TmdbEpisode[] } | undefined;
}
interface TmdbEpisode {
  season_number: number;
  episode_number: number;
  name: string;
  air_date: string | null;
  runtime: number | null;
}
interface TmdbSearchResult {
  id: number;
  name: string;
  overview: string;
  first_air_date?: string;
  poster_path: string | null;
}

const yearOf = (date?: string | null) => (date ? Number(date.slice(0, 4)) || null : null);

/** Accepts both a v3 API key and a v4 read access token (a JWT). */
async function request<T>(key: string, path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const headers: Record<string, string> = { accept: "application/json" };
  if (key.startsWith("eyJ")) headers.authorization = `Bearer ${key}`;
  else url.searchParams.set("api_key", key);
  const start = performance.now();
  const res = await fetch(url, { headers });
  // The path only: the query string can hold the API key.
  log.debug(`GET ${path} ${res.status} ${Math.round(performance.now() - start)}ms`);
  if (!res.ok) throw new TmdbError(res.status, path);
  return res.json() as Promise<T>;
}

export async function isValidTmdbKey(key: string): Promise<boolean> {
  try {
    await request(key, "/configuration");
    return true;
  } catch {
    return false;
  }
}

/** TMDB's placeholder when an episode has no translated title ("Épisode 5", "Folge 5"…). */
const GENERIC_EPISODE_NAME = /^(episode|épisode|episodio|episódio|folge|aflevering|odcinek|エピソード)\s*\d+$/i;

/** Fills what TMDB has not translated (empty overview, placeholder episode names) from English. */
export function withEnglishFallback(localized: Series, english: Series): Series {
  const englishNames = new Map(english.episodes.map((episode) => [`${episode.season}x${episode.number}`, episode.name]));
  return {
    ...localized,
    overview: localized.overview || english.overview,
    posterPath: localized.posterPath ?? english.posterPath,
    backdropPath: localized.backdropPath ?? english.backdropPath,
    episodes: localized.episodes.map((episode) => {
      const translated = episode.name.trim() && !GENERIC_EPISODE_NAME.test(episode.name.trim());
      return translated ? episode : { ...episode, name: englishNames.get(`${episode.season}x${episode.number}`) ?? episode.name };
    }),
  };
}

export class TmdbClient implements SeriesSource {
  constructor(
    private readonly key: () => string | null,
    private readonly language: () => string,
  ) {}

  private get<T>(path: string, params?: Record<string, string>) {
    const key = this.key();
    if (!key) throw new Error("TMDB key is not configured");
    return request<T>(key, path, { language: this.language(), ...params });
  }

  async fetch(tmdbId: number): Promise<Series> {
    const language = this.language();
    const localized = await this.fetchIn(tmdbId, language);
    if (language.startsWith("en")) return localized;
    return withEnglishFallback(localized, await this.fetchIn(tmdbId, "en-US"));
  }

  private async fetchIn(tmdbId: number, language: string): Promise<Series> {
    const show = await this.get<TmdbShow>(`/tv/${tmdbId}`, { language, append_to_response: "external_ids" });
    const seasons = show.seasons.map((season) => season.season_number).filter((number) => number > 0);
    const release = releaseOf(
      show.networks.map((network) => network.name),
      show.origin_country,
    );
    const episodes: Episode[] = [];
    for (let i = 0; i < seasons.length; i += SEASONS_PER_CALL) {
      const chunk = seasons.slice(i, i + SEASONS_PER_CALL);
      const data = await this.get<TmdbShow>(`/tv/${tmdbId}`, {
        language,
        append_to_response: chunk.map((seasonNumber) => `season/${seasonNumber}`).join(","),
      });
      for (const seasonNumber of chunk) {
        for (const episode of data[`season/${seasonNumber}`]?.episodes ?? []) {
          episodes.push({ season: episode.season_number, number: episode.episode_number, name: episode.name, airDate: episode.air_date ? airDateHere(episode.air_date, release) : null, runtime: episode.runtime || null });
        }
      }
    }
    return {
      tmdbId: show.id,
      tvdbId: show.external_ids?.tvdb_id ?? null,
      name: show.name,
      year: yearOf(show.first_air_date),
      overview: show.overview,
      posterPath: show.poster_path,
      backdropPath: show.backdrop_path,
      ended: show.status === "Ended" || show.status === "Canceled",
      episodes,
      fetchedAt: new Date(),
    };
  }

  async tvdbId(tmdbId: number) {
    return (await this.get<{ tvdb_id: number | null }>(`/tv/${tmdbId}/external_ids`)).tvdb_id ?? null;
  }

  async search(query: string): Promise<SeriesSummary[]> {
    const data = await this.get<{ results: TmdbSearchResult[] }>("/search/tv", { query });
    return data.results.map((result) => ({
      tmdbId: result.id,
      name: result.name,
      year: yearOf(result.first_air_date),
      overview: result.overview,
      posterPath: result.poster_path,
    }));
  }

  async findByEpisode(externalId: string, source: "tvdb_id" | "imdb_id") {
    const data = await this.get<{ tv_episode_results: { show_id: number }[]; tv_results: { id: number }[] }>(
      `/find/${encodeURIComponent(externalId)}`,
      { external_source: source },
    );
    return data.tv_episode_results[0]?.show_id ?? data.tv_results[0]?.id ?? null;
  }
}
