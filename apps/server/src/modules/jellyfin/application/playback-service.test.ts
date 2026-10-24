import { Database } from "bun:sqlite";
import { afterEach, expect, mock, spyOn, test } from "bun:test";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import type { Db } from "../../../shared/db";
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

function setup() {
  const sqlite = new Database(":memory:");
  const db = drizzle({ client: sqlite }) as unknown as Db;
  migrate(db, { migrationsFolder: join(import.meta.dir, "../../../../drizzle") });
  const now = Math.floor(Date.now() / 1000);
  sqlite.run(`insert into user (id, name, email, email_verified, created_at, updated_at) values ('u', 'U', 'u@x.io', 0, ${now}, ${now})`);
  return new PlaybackService(db);
}

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
    openUrl: "https://tv.example.com/web/#/details?id=e4",
  });

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
});
