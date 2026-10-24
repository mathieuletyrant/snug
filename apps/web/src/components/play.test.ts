import { expect, test } from "bun:test";
import { watchLink } from "@snug/shared";

const ep = { tmdbId: 95396, season: 2, episode: 3, itemId: null, jellyfinUrl: null };

test("each app gets its own link to an Episode", () => {
  expect(watchLink({ watchApp: "jellytv", watchLink: "" }, ep)).toBe("jellytv://tv/95396/season/2/episode/3");
  expect(watchLink({ watchApp: "jellytv", watchLink: "" }, { ...ep, itemId: "abc" })).toBe("jellytv://play/abc");
  expect(watchLink({ watchApp: "jellyfin", watchLink: "" }, ep)).toBeNull();
  expect(watchLink({ watchApp: "jellyfin", watchLink: "" }, { ...ep, itemId: "abc", jellyfinUrl: "https://tv.example.com" })).toBe(
    "https://tv.example.com/web/#/details?id=abc",
  );
  expect(watchLink({ watchApp: "custom", watchLink: "myapp://show/{tmdbId}/{season}/{episode}" }, ep)).toBe("myapp://show/95396/2/3");
  expect(watchLink({ watchApp: "custom", watchLink: "myapp://play/{itemId}" }, ep)).toBeNull();
  expect(watchLink({ watchApp: "custom", watchLink: "" }, ep)).toBeNull();
});
