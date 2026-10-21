import { expect, test } from "bun:test";
import { parseJellyfinEvent } from "./jellyfin-event";

const episode = {
  ItemType: "Episode",
  SeriesName: "Severance",
  SeasonNumber: "2",
  EpisodeNumber: 5,
  SeriesId: "abc",
  Provider_tvdb: "1234",
  Provider_tmdb: "999", // episode id: must not be used as the series id
};

test("a completed playback is a watch", () => {
  expect(parseJellyfinEvent({ ...episode, NotificationType: "PlaybackStop", PlayedToCompletion: "True" })).toEqual({
    kind: "episode-watched",
    seriesName: "Severance",
    season: 2,
    number: 5,
    jellyfinSeriesId: "abc",
    seriesTmdbId: undefined,
    tvdbEpisodeId: "1234",
    imdbEpisodeId: undefined,
  });
});

test("marking as played in Jellyfin is a watch", () => {
  const e = parseJellyfinEvent({ ...episode, NotificationType: "UserDataSaved", Played: true, SaveReason: "TogglePlayed" });
  expect(e.kind).toBe("episode-watched");
});

test("partial playback, unmarking and movies are ignored", () => {
  for (const body of [
    { ...episode, NotificationType: "PlaybackStop", PlayedToCompletion: false },
    { ...episode, NotificationType: "UserDataSaved", Played: false, SaveReason: "TogglePlayed" },
    { ...episode, NotificationType: "UserDataSaved", Played: true, SaveReason: "PlaybackProgress" },
    { ...episode, NotificationType: "PlaybackStop", PlayedToCompletion: true, ItemType: "Movie" },
    { NotificationType: "ItemAdded" },
  ]) {
    expect(parseJellyfinEvent(body).kind).toBe("ignored");
  }
});
