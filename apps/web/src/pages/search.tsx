import { useQuery } from "@tanstack/react-query";
import type { SeriesSummary } from "@snug/shared";
import { Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { Link } from "wouter";
import { api } from "../api";
import { PosterGridSkeleton } from "../components/skeletons";
import { Empty, PageTitle, Poster, POSTER_GRID } from "../components/ui";

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
      <div className="relative mb-6">
        <Search className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="A series title…"
          className="w-full rounded-2xl border border-line bg-surface py-3.5 pr-4 pl-12 placeholder:text-muted/60 focus:border-accent focus:outline-none"
        />
      </div>
      {isFetching && !data ? (
        <PosterGridSkeleton count={8} />
      ) : data?.length ? (
        <div className={POSTER_GRID}>
          {data.map((s) => (
            <Link key={s.tmdbId} href={`/series/${s.tmdbId}`} className="group space-y-1.5">
              <Poster path={s.posterPath} name={s.name} className="w-full transition group-hover:-translate-y-0.5" />
              <p className="truncate text-xs font-semibold sm:text-sm">{s.name}</p>
              <p className="text-[11px] text-muted sm:text-xs">{s.year ?? "—"}</p>
            </Link>
          ))}
        </div>
      ) : (
        q.length > 1 && <Empty icon={<Search className="size-10" />} title="No series found" />
      )}
    </>
  );
}
