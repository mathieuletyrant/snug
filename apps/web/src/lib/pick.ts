import type { AheadEpisode, SeriesCard } from "@snug/shared";

/** One Ready Series and as many of its Episodes as fit a Time budget (see GLOSSARY). */
export interface Pick {
  card: SeriesCard;
  episodes: AheadEpisode[];
  minutes: number;
}

/** A Saving up Series is watched in one go: everything it saved, or nothing. */
const least = (card: SeriesCard) => card.saving?.needed ?? 1;

const total = (episodes: AheadEpisode[]) => episodes.reduce((sum, episode) => sum + episode.minutes, 0);

function pickOf(card: SeriesCard, budget: number): Pick | null {
  const episodes: AheadEpisode[] = [];
  for (const episode of card.ahead) {
    if (total(episodes) + episode.minutes > budget) break;
    episodes.push(episode);
  }
  return episodes.length >= least(card) ? { card, episodes, minutes: total(episodes) } : null;
}

/** The Picks for a Time budget, best first: New, then the User's Rating, then chance. */
export function picks(cards: SeriesCard[], budget: number, random = Math.random): Pick[] {
  return cards
    .flatMap((card) => pickOf(card, budget) ?? [])
    .map((pick) => ({ pick, chance: random() }))
    .sort(
      (a, b) =>
        Number(b.pick.card.fresh) - Number(a.pick.card.fresh) ||
        (b.pick.card.rating ?? 0) - (a.pick.card.rating ?? 0) ||
        a.chance - b.chance,
    )
    .map(({ pick }) => pick);
}

/** When nothing fits the budget: the shortest Pick there is. */
export function shortest(cards: SeriesCard[]): Pick | null {
  const smallest = cards.flatMap((card) => {
    const episodes = card.ahead.slice(0, least(card));
    return episodes.length === least(card) ? [{ card, episodes, minutes: total(episodes) }] : [];
  });
  return smallest.sort((a, b) => a.minutes - b.minutes)[0] ?? null;
}
