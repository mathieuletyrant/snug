import { useQuery } from "@tanstack/react-query";
import { type SeriesCard, STATUSES, type Status } from "@snug/shared";
import { Library } from "lucide-react";
import { useState } from "react";
import { LibraryTile } from "@/components/series/library-tile";
import { PosterGridSkeleton } from "@/components/skeletons";
import { Chips, Empty, PageTitle, POSTER_GRID, SearchInput } from "@/components/ui";
import { useT } from "@/i18n";
import { libraryQuery } from "@/queries";

const SORTS = {
  name: (a: SeriesCard, b: SeriesCard) => a.name.localeCompare(b.name),
  lastWatched: (a: SeriesCard, b: SeriesCard) => (b.lastWatchedAt ?? "").localeCompare(a.lastWatchedAt ?? ""),
  // Undated last.
  nextEpisode: (a: SeriesCard, b: SeriesCard) => (a.next?.airDate ?? "9999").localeCompare(b.next?.airDate ?? "9999"),
};
type Sort = keyof typeof SORTS;

export function LibraryPage() {
  const { data, isPending } = useQuery(libraryQuery);
  const [status, setStatus] = useState<Status>("watching");
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<Sort>("name");
  const t = useT();

  if (isPending) {
    return (
      <>
        <PageTitle>{t.library.title}</PageTitle>
        <PosterGridSkeleton />
      </>
    );
  }
  const all = data ?? [];
  const shown = all
    .filter((c) => c.status === status && c.name.toLowerCase().includes(filter.toLowerCase()))
    .sort(SORTS[sort]);

  return (
    <>
      <PageTitle>{t.library.title}</PageTitle>
      <Chips
        label={t.library.statusFilter}
        value={status}
        onChange={setStatus}
        options={STATUSES.map((s) => ({
          value: s,
          label: (
            <>
              {t.status[s]} <span className="opacity-60">{all.filter((c) => c.status === s).length}</span>
            </>
          ),
        }))}
        className="-mx-4 mb-4 gap-2 px-4 pb-1 md:mx-0 md:px-0"
      />
      <SearchInput
        aria-label={t.library.filterLabel}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder={t.library.filter}
        className="mb-3"
      />
      <Chips
        label={t.library.sort}
        small
        value={sort}
        onChange={setSort}
        options={(Object.keys(SORTS) as Sort[]).map((s) => ({ value: s, label: t.library.sorts[s] }))}
        className="mb-6"
      />
      {shown.length ? (
        <div className={POSTER_GRID}>
          {shown.map((card) => (
            <LibraryTile key={card.seriesId} card={card} />
          ))}
        </div>
      ) : (
        <Empty icon={<Library className="size-10" />} title={t.library.empty(t.status[status])} />
      )}
    </>
  );
}
