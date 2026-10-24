import { useQuery } from "@tanstack/react-query";
import type { SeriesSummary } from "@snug/shared";
import { Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { api } from "../api";
import { PosterTile, TileLine } from "../components/poster-tile";
import { PosterGridSkeleton } from "../components/skeletons";
import { Empty, PageTitle, POSTER_GRID, SearchInput } from "../components/ui";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim());
  const { data, isFetching } = useQuery({
    queryKey: ["search", q],
    queryFn: () => api<SeriesSummary[]>(`/search?q=${encodeURIComponent(q)}`),
    enabled: q.length > 1,
    staleTime: 5 * 60_000,
  });

  return (
    <>
      <PageTitle>Search</PageTitle>
      <SearchInput
        icon
        aria-label="Search a series"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="A series title…"
        className="mb-6"
      />
      {isFetching && !data ? (
        <PosterGridSkeleton count={8} />
      ) : data?.length ? (
        <div className={POSTER_GRID}>
          {data.map((s) => (
            <PosterTile key={s.tmdbId} href={`/series/${s.tmdbId}`} posterPath={s.posterPath} name={s.name}>
              <TileLine>{s.year ?? "—"}</TileLine>
            </PosterTile>
          ))}
        </div>
      ) : (
        q.length > 1 && <Empty icon={<Search className="size-10" />} title="No series found" />
      )}
    </>
  );
}
