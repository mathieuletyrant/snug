import type { Home, SeriesCard } from "@snug/shared";
import { api } from "./api";

/** Shared by the pages and the tab bar, which loads them as soon as a tab is touched. */
export const homeQuery = { queryKey: ["home"], queryFn: () => api<Home>("/home") };
export const libraryQuery = { queryKey: ["library"], queryFn: () => api<SeriesCard[]>("/library") };
