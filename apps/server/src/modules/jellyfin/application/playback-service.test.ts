import { afterEach, expect, mock, spyOn, test } from "bun:test";
import { testDb } from "../../../shared/testing";
import { PlaybackService } from "./playback-service";

afterEach(() => mock.restore());

/** A fake Jellyfin: one series (TMDB 95396) with S01E04, a TV that accepts remote control, a phone that doesn't. */
function fakeJellyfin() {
  const calls: string[] = [];
  spyOn(globalThis, "fetch").mockImplementation((async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push(`${init?.method ?? "GET"} ${url.pathname}${url.search}`);
    const json = (body: unknown) => Response.json(body);
    if (url.pathname === "/System/Info") return json({ Version: "10.11.0" });
    if (url.pathname === "/Items") return json({ Items: [{ Id: "s1", ProviderIds: { Tmdb: "95396" } }] });
    if (url.pathname === "/Shows/s1/Episodes") return json({ Items: [{ Id: "e4", ParentIndexNumber: 1, IndexNumber: 4 }] });
    if (url.pathname === "/Sessions")
      return json([
        { Id: "tv", DeviceName: "Living room", Client: "JellyTV", SupportsRemoteControl: true },
        { Id: "phone", DeviceName: "iPhone", Client: "Swiftfin", SupportsRemoteControl: false },
      ]);
    if (url.pathname === "/Sessions/tv/Playing") return new Response(null, { status: 204 });
    return new Response(null, { status: 404 });
  }) as typeof fetch);
  return calls;
}

const setup = () => new PlaybackService(testDb().db);

test("plays an Episode on a player that accepts remote control, never on another one", async () => {
  const calls = fakeJellyfin();
  const playback = setup();
  expect(playback.enabled("u")).toBe(false);

  await playback.saveServer({ url: "http://jellyfin:8096", apiKey: "key", publicUrl: "https://tv.example.com/" });
  playback.link("u", "jf-user");
  expect(playback.enabled("u")).toBe(true);

  const ep = { season: 1, number: 4 };
  expect(await playback.options("u", 95396, ep)).toEqual({
    players: [{ sessionId: "tv", name: "Living room · JellyTV" }],
    itemId: "e4",
    jellyfinUrl: "https://tv.example.com",
  });
  // Not in Jellyfin: no players and no id, the app can still be opened by TMDB id.
  expect(await playback.options("u", 1, ep)).toEqual({ players: [], itemId: null, jellyfinUrl: "https://tv.example.com" });

  await playback.play("u", 95396, ep, "tv");
  expect(calls).toContain("POST /Sessions/tv/Playing?playCommand=PlayNow&itemIds=e4");
  await expect(playback.play("u", 95396, ep, "phone")).rejects.toThrow("This player is gone");
});

test("a server that doesn't answer is not saved", async () => {
  spyOn(globalThis, "fetch").mockImplementation((async () => new Response(null, { status: 401 })) as unknown as typeof fetch);
  const playback = setup();
  await expect(playback.saveServer({ url: "http://jellyfin:8096", apiKey: "bad", publicUrl: "" })).rejects.toThrow(
    "Jellyfin refused the API key",
  );
  expect(playback.server()).toEqual({ url: "", publicUrl: "", hasApiKey: false });
  expect(await playback.options("u", 95396, { season: 1, number: 4 })).toEqual({ players: [], itemId: null, jellyfinUrl: null });
});
