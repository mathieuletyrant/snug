import { expect, test } from "bun:test";
import type { Series } from "@/modules/catalog/domain/series";
import { testDb } from "@/shared/testing";
import { DrizzleCatalogRepository } from "./drizzle-catalog-repository";

const onePiece = (seasonNames: Record<number, string>): Series => ({
  tmdbId: 37854,
  tvdbId: 81797,
  name: "One Piece",
  year: 1999,
  overview: "",
  posterPath: null,
  backdropPath: null,
  ended: false,
  episodes: [
    { season: 1, number: 1, name: "Je suis Luffy !", airDate: "1999-10-20", runtime: 24 },
    { season: 2, number: 62, name: "Laboon", airDate: "2001-03-21", runtime: 24 },
  ],
  seasonNames,
  fetchedAt: new Date("2026-11-09T00:00:00Z"),
});

test("season names are saved with the Series, and replaced on the next refresh", async () => {
  const repo = new DrizzleCatalogRepository(testDb().db);
  await repo.save(onePiece({ 1: "Arc East Blue", 2: "Arc Grand Line" }));
  expect((await repo.get(37854))?.seasonNames).toEqual({ 1: "Arc East Blue", 2: "Arc Grand Line" });

  await repo.save(onePiece({ 1: "Arc East Blue" }));
  expect((await repo.get(37854))?.seasonNames).toEqual({ 1: "Arc East Blue" });
});
