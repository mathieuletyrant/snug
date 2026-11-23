import { QueryClient } from "@tanstack/react-query";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({ basePath: "/api/auth" });

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Field name → what is wrong with it. */
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

/** `body` is sent as JSON; `text` as-is with `contentType` (e.g. a CSV file). */
export async function api<T = void>(
  path: string,
  init: { method?: string; body?: unknown; text?: string; contentType?: string } = {},
): Promise<T> {
  const raw = init.text !== undefined;
  const hasBody = raw || init.body !== undefined;
  const res = await fetch(`/api${path}`, {
    method: init.method ?? (hasBody ? "POST" : "GET"),
    headers: hasBody ? { "content-type": raw ? (init.contentType ?? "text/plain") : "application/json" } : undefined,
    body: raw ? init.text : hasBody ? JSON.stringify(init.body) : undefined,
    credentials: "same-origin",
    // Snug's API never redirects: a redirect is Cloudflare Access asking to sign in again.
    redirect: "manual",
  });
  if (res.type === "opaqueredirect") {
    signInAgainThroughAccess();
    throw new ApiError(0, "Cloudflare Access session expired");
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string; fields?: Record<string, string> } | null;
    throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`, data?.fields);
  }
  return (res.status === 204 || res.status === 201 ? undefined : await res.json()) as T;
}

const ACCESS_RELOAD_KEY = "snug:access-reload";

/** Reloads the page so the browser itself follows Access to its sign-in; at most once a minute, against a loop. */
function signInAgainThroughAccess() {
  try {
    const last = Number(sessionStorage.getItem(ACCESS_RELOAD_KEY) ?? 0);
    if (Date.now() - last < 60_000) return;
    sessionStorage.setItem(ACCESS_RELOAD_KEY, String(Date.now()));
  } catch {
    // No sessionStorage: reload all the same.
  }
  location.reload();
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: (n, err) => !(err instanceof ApiError && err.status < 500) && n < 2 },
  },
});

/** TMDB image served through Snug's disk cache. */
type ImageSize = "w92" | "w154" | "w185" | "w300" | "w342" | "w500" | "w780" | "w1280";

export const image = (path: string | null, size: ImageSize) =>
  path ? `/api/images/${size}${path}` : null;

const srcSet = (path: string, sizes: ImageSize[]) => sizes.map((size) => `${image(path, size)} ${size.slice(1)}w`).join(", ");

/** Poster widths available, for `srcset`. */
export const posterSrcSet = (path: string) => srcSet(path, ["w92", "w154", "w185", "w342", "w500"]);
/** Backdrop (landscape) widths available, for `srcset`. */
export const backdropSrcSet = (path: string) => srcSet(path, ["w300", "w780", "w1280"]);
