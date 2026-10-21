import { cx, POSTER_GRID, POSTER_ROW, POSTER_ROW_ITEM, Skeleton } from "./ui";

const times = (n: number) => Array.from({ length: n }, (_, i) => i);

export function TitleSkeleton() {
  return <Skeleton className="mb-6 h-9 w-56" />;
}

/** Poster grid (Library, Search, Upcoming). */
export function PosterGridSkeleton({ count = 16 }: { count?: number }) {
  return (
    <div className={POSTER_GRID}>
      {times(count).map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-[2/3] w-full" />
          <Skeleton className="h-3.5 w-3/4 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <>
      <TitleSkeleton />
      <Skeleton className="mb-3 h-6 w-40" />
      <div className="mb-10 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {times(3).map((i) => (
          <Skeleton key={i} className="h-[6.5rem] w-full" />
        ))}
      </div>
      <Skeleton className="mb-3 h-6 w-32" />
      <div className={POSTER_ROW}>
        {times(8).map((i) => (
          <div key={i} className={cx(POSTER_ROW_ITEM, "space-y-2")}>
            <Skeleton className="aspect-[2/3] w-full" />
            <Skeleton className="h-3.5 w-3/4 rounded-full" />
          </div>
        ))}
      </div>
    </>
  );
}

export function SeriesSkeleton() {
  return (
    <>
      <Skeleton className="size-9 rounded-full" />
      <div className="mt-20 grid grid-cols-[7rem_minmax(0,1fr)] gap-x-5 gap-y-6 md:mt-36 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-x-8">
        <Skeleton className="aspect-[2/3] w-full md:row-span-2" />
        <div className="flex flex-col justify-end gap-3 md:justify-start md:pt-6">
          <Skeleton className="h-9 w-3/4 rounded-full" />
          <Skeleton className="h-4 w-1/2 rounded-full" />
        </div>
        <div className="col-span-2 space-y-4 md:col-span-1 md:col-start-2">
          <div className="flex gap-2">
            {times(3).map((i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-4 w-full rounded-full" />
          <Skeleton className="h-4 w-5/6 rounded-full" />
        </div>
      </div>
      <div className="mt-8 space-y-3">
        {times(3).map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-3xl" />
        ))}
      </div>
    </>
  );
}
