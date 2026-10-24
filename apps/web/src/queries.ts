import type { Home, SeriesCard, Stats } from "@snug/shared";
import { api } from "./api";

/** Shared by the pages and the tab bar, which loads them as soon as a tab is touched. */
export const homeQuery = { queryKey: ["home"], queryFn: () => api<Home>("/home") };
export const statsQuery = { queryKey: ["stats"], queryFn: () => api<Stats>("/stats") };
export const libraryQuery = { queryKey: ["library"], queryFn: () => api<SeriesCard[]>("/library") };
