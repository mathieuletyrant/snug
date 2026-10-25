import { expect, test } from "bun:test";
import type { CatalogService } from "@/modules/catalog/application/catalog-service";
import type { TrackingService } from "@/modules/tracking/application/tracking-service";
import { FeedsService } from "./feeds-service";

test("the Sonarr list carries TVDB ids, and leaves out Series without one", async () => {
  const tracking = { seriesIdsWithStatus: async () => [1, 2] } as unknown as TrackingService;
  const catalog = {
    getMany: async () =>
      new Map([
        [1, { name: "Severance" }],
        [2, { name: "Unknown on TVDB" }],
      ]),
    tvdbIds: async () => new Map([[1, 371980], [2, null]]),
  } as unknown as CatalogService;

  const list = await new FeedsService(tracking, catalog).sonarrList("u", ["watchlist"]);
  expect(list).toEqual([{ title: "Severance", tvdbId: 371980 }]);
});

test("the calendar lists the Episodes of the last month and to come, as all-day events", async () => {
  let from = "";
  const series = { tmdbId: 1, name: "Pluribus, a very long name; that needs escaping and folding past 75 bytes" };
  const tracking = {
    airing: async (_: string, since: string) => {
      from = since;
      return [{ series, episode: { season: 1, number: 2, name: "Secret", airDate: "2026-10-20" } }];
    },
  } as unknown as TrackingService;
  const catalog = {} as CatalogService;

  const ics = await new FeedsService(tracking, catalog).calendar("u", new Date("2026-10-25T12:00:00Z"));
  expect(ics).toContain("UID:1-1-2@snug\r\n");
  expect(ics).toContain("DTSTART;VALUE=DATE:20261020\r\nDTEND;VALUE=DATE:20261021\r\n");
  expect(from).toBe("2026-09-25");
  expect(ics).not.toContain("Secret");
  expect(ics).toContain("SUMMARY:Pluribus\\, a very long name\\; that");
  expect(ics.split("\r\n").every((line) => Buffer.byteLength(line) <= 75)).toBe(true);
  expect(ics.replaceAll("\r\n ", "")).toContain("folding past 75 bytes S01E02\r\n");
});
