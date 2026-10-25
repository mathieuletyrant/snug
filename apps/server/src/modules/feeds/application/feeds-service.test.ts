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
