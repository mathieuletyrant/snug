import { useQuery } from "@tanstack/react-query";
import { STATUS_LABELS, STATUSES, type Status } from "@snug/shared";
import { Library } from "lucide-react";
import { useState } from "react";
import { LibraryTile } from "../components/series/library-tile";
import { PosterGridSkeleton } from "../components/skeletons";
import { Chips, Empty, PageTitle, POSTER_GRID, SearchInput } from "../components/ui";
import { libraryQuery } from "../queries";

export function LibraryPage() {
  const { data, isPending } = useQuery(libraryQuery);
  const [status, setStatus] = useState<Status>("watching");
  const [filter, setFilter] = useState("");

  if (isPending) {
    return (
      <>
        <PageTitle>Library</PageTitle>
        <PosterGridSkeleton />
      </>
    );
  }
  const all = data ?? [];
  const shown = all.filter((c) => c.status === status && c.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <>
      <PageTitle>Library</PageTitle>
      <Chips
        label="Status"
        value={status}
        onChange={setStatus}
        options={STATUSES.map((s) => ({
          value: s,
          label: (
            <>
              {STATUS_LABELS[s]} <span className="opacity-60">{all.filter((c) => c.status === s).length}</span>
            </>
          ),
        }))}
        className="-mx-4 mb-4 gap-2 px-4 pb-1 md:mx-0 md:px-0"
      />
      <SearchInput
        aria-label="Filter the library"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter…"
        className="mb-6"
      />
      {shown.length ? (
        <div className={POSTER_GRID}>
          {shown.map((card) => (
            <LibraryTile key={card.seriesId} card={card} />
          ))}
        </div>
      ) : (
        <Empty icon={<Library className="size-10" />} title={`No ${STATUS_LABELS[status].toLowerCase()} series`} />
      )}
    </>
  );
}
