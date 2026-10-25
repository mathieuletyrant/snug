import { useQuery } from "@tanstack/react-query";
import type { SeriesSummary } from "@snug/shared";
import { Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { api } from "@/api";
import { PosterTile, TileLine } from "@/components/poster-tile";
import { PosterGridSkeleton } from "@/components/skeletons";
import { Empty, PageTitle, POSTER_GRID, SearchInput } from "@/components/ui";
import { useT } from "@/i18n";

export function SearchPage() {
  const t = useT();
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
      <PageTitle>{t.search.title}</PageTitle>
      <SearchInput
        icon
        aria-label={t.search.label}
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.search.placeholder}
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
        q.length > 1 && <Empty icon={<Search className="size-10" />} title={t.search.empty} />
      )}
    </>
  );
}
