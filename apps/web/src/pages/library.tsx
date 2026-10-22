import { useQuery } from "@tanstack/react-query";
import { STATUS_LABELS, STATUSES, type SeriesCard, type Status } from "@snug/shared";
import { Library } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { api } from "../api";
import { StatusMenu } from "../components/series-actions";
import { PosterGridSkeleton } from "../components/skeletons";
import { Chips, Empty, PageTitle, Poster, POSTER_GRID, ProgressBar } from "../components/ui";

export function LibraryPage() {
  const { data, isPending } = useQuery({ queryKey: ["library"], queryFn: () => api<SeriesCard[]>("/library") });
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
        onChange={(s) => setStatus(s as Status)}
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
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter…"
        className="mb-6 w-full rounded-2xl border border-line bg-surface px-4 py-2.5 text-sm placeholder:text-muted/60 focus:border-accent focus:outline-none"
      />
      {shown.length ? (
        <div className={POSTER_GRID}>
          {shown.map((c) => (
            <div key={c.seriesId} className="relative">
              <Link href={`/series/${c.seriesId}`} className="group block space-y-1.5">
                <Poster path={c.posterPath} name={c.name} className="w-full transition group-hover:-translate-y-0.5" />
                <p className="truncate text-xs font-semibold sm:text-sm">{c.name}</p>
                {c.airedCount > 0 && <ProgressBar value={c.watchedCount} max={c.airedCount} />}
              </Link>
              {/* Change status without opening the series */}
              <div className="absolute top-1 right-1 rounded-full bg-bg/60 backdrop-blur">
                <StatusMenu seriesId={c.seriesId} status={c.status} small />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty icon={<Library className="size-10" />} title={`No ${STATUS_LABELS[status].toLowerCase()} series`} />
      )}
    </>
  );
}
