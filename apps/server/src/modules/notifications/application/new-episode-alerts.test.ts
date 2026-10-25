import { afterEach, expect, test } from "bun:test";
import { DEFAULT_PREFERENCES, type Episode } from "@snug/shared";
import { setLanguageSource } from "@/shared/i18n";
import { testDb } from "@/shared/testing";
import { describe, NewEpisodeAlerts } from "./new-episode-alerts";
import type { Notification } from "./notification-service";

afterEach(() => setLanguageSource(() => "en-US"));

const ep = (number: number, airDate: string): Episode => ({ season: 4, number, name: `E${number}`, airDate });

function setup(at: string, episodes: Episode[], notifyNewEpisodes = true) {
  const { db } = testDb();
  const sent: Notification[] = [];
  const asked: string[][] = [];
  const alerts = new NewEpisodeAlerts(
    db,
    {
      newEpisodesOn: async (days) => {
        asked.push([...days]);
        const airing = episodes.filter((episode) => days.includes(episode.airDate!));
        return airing.length ? [{ userId: "u", series: { tmdbId: 7, name: "Tracker" }, episodes: airing }] : [];
      },
    },
    { notify: async (_userId, n) => void sent.push(n) },
    () => ({ ...DEFAULT_PREFERENCES, notifyNewEpisodes }),
    () => new Date(at),
  );
  return { alerts, sent, asked };
}

test("a new Episode is announced once, from the evening of its air date", async () => {
  const morning = setup("2026-10-24T09:00:00Z", [ep(2, "2026-10-24")]);
  expect(await morning.alerts.run()).toBe(0);
  expect(morning.asked).toEqual([]);

  const { alerts, sent, asked } = setup("2026-10-24T17:00:00Z", [ep(2, "2026-10-24")]);
  expect(await alerts.run()).toBe(1);
  expect(await alerts.run()).toBe(0);
  expect(asked[0]).toEqual(["2026-10-23", "2026-10-24"]);
  expect(sent).toEqual([{ title: "📺 Tracker", body: "S04E02 is out", url: "/series/7", tag: "new-7" }]);
});

test("nothing is sent to a User who turned new-episode notifications off", async () => {
  const { alerts, sent } = setup("2026-10-24T17:00:00Z", [ep(2, "2026-10-24")], false);
  expect(await alerts.run()).toBe(0);
  expect(sent).toEqual([]);
});

test("a season dropped at once is one notification", () => {
  expect(describe([ep(1, "2026-10-24"), ep(2, "2026-10-24"), ep(3, "2026-10-24")])).toBe(
    "3 new episodes: S04E01 to S04E03",
  );
});

test("in French when the instance is", () => {
  setLanguageSource(() => "fr-FR");
  expect(describe([ep(2, "2026-10-24")])).toBe("S04E02 est sorti");
  expect(describe([ep(1, "2026-10-24"), ep(2, "2026-10-24")])).toBe("2 nouveaux épisodes : S04E01 à S04E02");
});
