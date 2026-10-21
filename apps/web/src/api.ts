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

export async function api<T = void>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: init.method ?? (init.body === undefined ? "GET" : "POST"),
    headers: init.body === undefined ? undefined : { "content-type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    credentials: "same-origin",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string; fields?: Record<string, string> } | null;
    throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`, data?.fields);
  }
  return (res.status === 204 || res.status === 201 ? undefined : await res.json()) as T;
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
