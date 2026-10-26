import { expect, test } from "bun:test";
import { testDb } from "@/shared/testing";
import { Ntfy } from "./ntfy";

function setup(status = 200) {
  const requests: { url: string; headers: Record<string, string>; body: Record<string, unknown> }[] = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    requests.push({ url, headers: init.headers as Record<string, string>, body: JSON.parse(init.body as string) });
    return Response.json(status === 200 ? {} : { error: "unauthorized" }, { status });
  }) as unknown as typeof fetch;
  return { ntfy: new Ntfy(testDb().db, fetcher), requests };
}

const notification = { title: "📺 Severance", body: "S02E05 is out", url: "/series/1" };

test("publishes to each topic with ntfy's JSON API, the token as a Bearer", async () => {
  const { ntfy, requests } = setup();
  await ntfy.send({ server: "http://ntfy_app_1:80/", token: "tk_x", topics: ["arr", "snug"], tags: ["tv"] }, notification);

  expect(requests.map((request) => [request.url, request.body.topic])).toEqual([
    ["http://ntfy_app_1:80", "arr"],
    ["http://ntfy_app_1:80", "snug"],
  ]);
  expect(requests[0]!.headers.Authorization).toBe("Bearer tk_x");
  expect(requests[0]!.body).toMatchObject({ title: "📺 Severance", message: "S02E05 is out", tags: ["tv"] });
});

test("an empty server is ntfy.sh, and no token sends no Authorization", async () => {
  const { ntfy, requests } = setup();
  await ntfy.send({ server: "", token: null, topics: ["arr"], tags: [] }, notification);
  expect(requests[0]!.url).toBe("https://ntfy.sh");
  expect(requests[0]!.headers.Authorization).toBeUndefined();
});

test("a refused publish throws with ntfy's message", async () => {
  const { ntfy } = setup(401);
  await expect(ntfy.send({ server: "", token: null, topics: ["arr"], tags: [] }, notification)).rejects.toThrow(
    'ntfy 401 on "arr": unauthorized',
  );
});

test("saving keeps the token when the field is left empty, and never shows it", () => {
  const { ntfy } = setup();
  expect(ntfy.config()).toBeNull();

  ntfy.save({ server: "", token: "tk_x", topics: ["arr"], tags: [] });
  ntfy.save({ server: "https://ntfy.example.com", token: "", topics: ["arr"], tags: ["tv"] });

  expect(ntfy.config()?.token).toBe("tk_x");
  expect(ntfy.settings()).toEqual({ server: "https://ntfy.example.com", topics: ["arr"], tags: ["tv"], hasToken: true });
});

test("no topic means ntfy is off", () => {
  const { ntfy } = setup();
  ntfy.save({ server: "", token: "", topics: [], tags: [] });
  expect(ntfy.config()).toBeNull();
});
