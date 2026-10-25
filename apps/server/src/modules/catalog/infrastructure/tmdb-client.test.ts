import { expect, test } from "bun:test";
import type { Series } from "@/modules/catalog/domain/series";
import { withEnglishFallback } from "./tmdb-client";

const series = (overview: string, names: string[]): Series => ({
  tmdbId: 1,
  tvdbId: null,
  name: "Dark",
  year: 2017,
  overview,
  posterPath: null,
  backdropPath: "/en.jpg",
  ended: true,
  episodes: names.map((name, i) => ({ season: 1, number: i + 1, name, airDate: "2017-12-01" })),
  fetchedAt: new Date(),
});

test("untranslated overview and placeholder episode names fall back to English", () => {
  const merged = withEnglishFallback(
    series("", ["Secrets", "Épisode 2", ""]),
    series("A missing child…", ["Secrets", "Lies", "Past and Present"]),
  );
  expect(merged.overview).toBe("A missing child…");
  expect(merged.episodes.map((episode) => episode.name)).toEqual(["Secrets", "Lies", "Past and Present"]);
  expect(merged.backdropPath).toBe("/en.jpg");
});

test("translations are kept", () => {
  const merged = withEnglishFallback(series("Un enfant disparaît…", ["Secrets", "Mensonges"]), series("A missing child…", ["Secrets", "Lies"]));
  expect(merged.overview).toBe("Un enfant disparaît…");
  expect(merged.episodes[1]?.name).toBe("Mensonges");
});
