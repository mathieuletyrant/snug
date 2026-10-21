import { expect, test } from "bun:test";
import { withSecureCookies } from "./http";

const response = () => {
  const res = new Response("ok");
  res.headers.append("set-cookie", "better-auth.session_token=abc; Path=/; HttpOnly; SameSite=Lax");
  res.headers.append("set-cookie", "other=1; Path=/; Secure");
  return res;
};

test("HTTPS requests (direct or behind a TLS proxy) get Secure cookies", () => {
  for (const req of [
    new Request("https://snug.example.com/api/auth/sign-in/email"),
    new Request("http://snug:3000/api/auth/sign-in/email", { headers: { "x-forwarded-proto": "https" } }),
  ]) {
    expect(withSecureCookies(req, response()).headers.getSetCookie()).toEqual([
      "better-auth.session_token=abc; Path=/; HttpOnly; SameSite=Lax; Secure",
      "other=1; Path=/; Secure",
    ]);
  }
});

test("plain HTTP requests keep cookies as they are", () => {
  const cookies = withSecureCookies(new Request("http://umbrel.local:3000/api/auth/sign-in/email"), response()).headers.getSetCookie();
  expect(cookies[0]).not.toContain("Secure");
});
