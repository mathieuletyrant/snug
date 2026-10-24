import { useQuery } from "@tanstack/react-query";
import { STATUSES, type Status } from "@snug/shared";
import { Library } from "lucide-react";
import { useState } from "react";
import { LibraryTile } from "../components/series/library-tile";
import { PosterGridSkeleton } from "../components/skeletons";
import { Chips, Empty, PageTitle, POSTER_GRID, SearchInput } from "../components/ui";
import { useT } from "../i18n";
import { libraryQuery } from "../queries";

export function LibraryPage() {
  const { data, isPending } = useQuery(libraryQuery);
  const [status, setStatus] = useState<Status>("watching");
  const [filter, setFilter] = useState("");
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
  const shown = all.filter((c) => c.status === status && c.name.toLowerCase().includes(filter.toLowerCase()));

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
