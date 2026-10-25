import { afterEach, expect, test } from "bun:test";
import { startOf, today } from "./day";

const zone = process.env.TZ;
afterEach(() => {
  if (zone === undefined) delete process.env.TZ;
  else process.env.TZ = zone;
});

test("startOf: today() reads the same day back, whatever the instance's time zone", () => {
  for (const timeZone of ["UTC", "America/Los_Angeles", "Europe/Paris", "Pacific/Kiritimati"]) {
    process.env.TZ = timeZone;
    expect(today(startOf("2024-02-18"))).toBe("2024-02-18");
  }
});
