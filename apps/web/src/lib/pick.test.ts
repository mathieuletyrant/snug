import { expect, test } from "bun:test";
import type { SeriesCard } from "@snug/shared";
import { picks, shortest } from "./pick";

const card = (seriesId: number, minutes: number[], extra: Partial<SeriesCard> = {}) =>
  ({
    seriesId,
    fresh: false,
    rating: null,
    saving: null,
    ahead: minutes.map((runtime, index) => ({ season: 1, number: index + 1, absolute: index + 1, minutes: runtime, seasonEnd: false })),
    ...extra,
  }) as SeriesCard;

const ids = (cards: SeriesCard[], budget: number) => picks(cards, budget, () => 0.5).map((pick) => [pick.card.seriesId, pick.episodes.length]);

test("a Pick takes as many Episodes as fit the budget, and none that don't fit", () => {
  expect(ids([card(1, [22, 22, 22]), card(2, [45])], 60)).toEqual([[1, 2], [2, 1]]);
  expect(ids([card(1, [22, 22, 22]), card(2, [45])], 30)).toEqual([[1, 1]]);
});

test("New first, then the Rating, unrated last", () => {
  const cards = [card(1, [20]), card(2, [20], { rating: 8 }), card(3, [20], { fresh: true }), card(4, [20], { rating: 9 })];
  expect(ids(cards, 30).map(([seriesId]) => seriesId)).toEqual([3, 4, 2, 1]);
});

test("a Saving up Series is proposed only when everything it saved fits", () => {
  const saving = { target: 3, out: 4, needed: 3, reached: true, completeOn: null } as const;
  expect(ids([card(1, [20, 20, 20, 20], { saving })], 45)).toEqual([]);
  expect(ids([card(1, [20, 20, 20, 20], { saving })], 60)).toEqual([[1, 3]]);
});

test("when nothing fits, the shortest Pick there is", () => {
  const saving = { target: 3, out: 3, needed: 3, reached: true, completeOn: null } as const;
  expect(shortest([card(1, [50]), card(2, [12, 12, 12], { saving }), card(3, [40])])?.card.seriesId).toBe(2);
  expect(shortest([card(1, [])])).toBeNull();
});
