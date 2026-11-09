import { expect, test } from "bun:test";
import type { Series } from "@/modules/catalog/domain/series";
import { seasonName, withEnglishFallback } from "./tmdb-client";

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

test("a season keeps its own name, without the number TMDB sometimes repeats in it", () => {
  expect(seasonName("S01 - Arc East Blue")).toBe("Arc East Blue");
  expect(seasonName("Book One: Water")).toBe("Book One: Water");
  expect(seasonName("Saison 2")).toBeNull();
  expect(seasonName("Season 12")).toBeNull();
  expect(seasonName("S03 - Saison 3")).toBeNull();
  expect(seasonName("  ")).toBeNull();
});

test("season names TMDB has not translated fall back to English", () => {
  const merged = withEnglishFallback(
    { ...series("", []), seasonNames: { 1: "Arc East Blue" } },
    { ...series("", []), seasonNames: { 1: "East Blue", 2: "Entering into the Grand Line" } },
  );
  expect(merged.seasonNames).toEqual({ 1: "Arc East Blue", 2: "Entering into the Grand Line" });
});
