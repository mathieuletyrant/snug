import { useQuery } from "@tanstack/react-query";
import type { Stats } from "@snug/shared";
import { ArrowLeft, ChartColumn } from "lucide-react";
import { Link } from "wouter";
import { statsQuery } from "../queries";
import { Card, cx, Empty, PageTitle, Poster, Skeleton } from "../components/ui";

export function StatsPage() {
  const { data, isPending } = useQuery(statsQuery);

  return (
    <>
      <Link href="/library" aria-label="Back to Library" className="mb-4 inline-flex rounded-full bg-raised p-2">
        <ArrowLeft className="size-5" />
      </Link>
      <PageTitle>Stats</PageTitle>
      {isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : !data?.episodes ? (
        <Empty icon={<ChartColumn className="size-10" />} title="Nothing watched yet">
          Mark a few episodes watched and your numbers show up here.
        </Empty>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tile value={data.episodes} label="Episodes watched" />
            <Tile value={data.thisMonth} label="This month" />
            <Tile value={data.watching} label="Watching" />
            <Tile value={data.completed} label="Completed" />
          </div>
          <Months months={data.months} />
          <Top top={data.top} />
        </div>
      )}
    </>
  );
}

function Tile({ value, label }: { value: number; label: string }) {
  return (
    <Card className="p-4">
      <p className="font-display text-3xl font-semibold text-accent">{value}</p>
      <p className="text-sm text-muted">{label}</p>
    </Card>
  );
}

/** One bar per month; the current month in full color. */
function Months({ months }: { months: Stats["months"] }) {
  const max = Math.max(1, ...months.map((m) => m.episodes));
  return (
    <Card>
      <h2 className="mb-4 text-xl">Last 12 months</h2>
      <div className="flex h-36 items-end gap-1.5">
        {months.map((m, i) => {
          const last = i === months.length - 1;
          const name = new Date(`${m.month}-01T12:00:00Z`).toLocaleDateString(undefined, { month: "short" });
          return (
            <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-[10px] font-bold text-muted">{m.episodes || ""}</span>
              <div
                title={`${name}: ${m.episodes}`}
                className={cx("w-full rounded-t-md", last ? "bg-accent" : "bg-accent/40")}
                style={{ height: `${(m.episodes / max) * 100}%`, minHeight: m.episodes ? 4 : 0 }}
              />
              <span className={cx("text-[10px]", last ? "font-bold text-text" : "text-muted")}>{name.slice(0, 3)}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Top({ top }: { top: Stats["top"] }) {
  const max = top[0]?.episodes ?? 1;
  return (
    <Card>
      <h2 className="mb-4 text-xl">Most watched</h2>
      <ol className="space-y-3">
        {top.map((t) => (
          <li key={t.seriesId}>
            <Link href={`/series/${t.seriesId}`} className="flex items-center gap-3">
              <Poster path={t.posterPath} name={t.name} className="w-10 rounded-lg" sizes="40px" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{t.name}</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-raised">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(t.episodes / max) * 100}%` }} />
                </div>
              </div>
              <span className="w-16 text-right text-sm font-bold text-muted">{t.episodes} ep.</span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}
