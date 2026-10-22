import { useQuery } from "@tanstack/react-query";
import { episodeCode, type SeriesCard } from "@snug/shared";
import { Check, Coffee, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { homeQuery } from "../queries";
import { StatusMenu, useWatchNext } from "../components/series-actions";
import { usePreferences } from "../components/preferences";
import { HomeSkeleton } from "../components/skeletons";
import { Backdrop, Button, cx, Empty, PageTitle, Poster, POSTER_GRID, Skeleton } from "../components/ui";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Cozy evening";
};

export function HomePage() {
  const { data, isPending } = useQuery(homeQuery);
  const { hideUndatedUpcoming } = usePreferences();

  if (isPending) return <HomeSkeleton />;
  const upcoming = hideUndatedUpcoming ? (data?.upcoming ?? []).filter((c) => !c.loaded || c.next?.airDate) : (data?.upcoming ?? []);
  if (!data || (!data.ready.length && !upcoming.length)) {
    return (
      <>
        <PageTitle>{greeting()}</PageTitle>
        <Empty icon={<Coffee className="size-10" />} title="Nothing on the couch yet">
          Find a series to start, import your history from Settings, or connect Jellyfin.
          <div className="mt-5">
            <Link href="/search">
              <Button>Find a series</Button>
            </Link>
          </div>
        </Empty>
      </>
    );
  }

  return (
    <>
      <PageTitle>{greeting()}</PageTitle>

      {data.ready.length > 0 && (
        <section className="mb-10">
          <SectionTitle count={data.ready.length}>Ready to watch</SectionTitle>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {data.ready.map((card) => (
              <ReadyCard key={card.seriesId} card={card} />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <SectionTitle count={upcoming.length}>Upcoming</SectionTitle>
          <div className={POSTER_GRID}>
            {upcoming.map((card) => (
              <UpcomingCard key={card.seriesId} card={card} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function SectionTitle({ children, count }: { children: string; count: number }) {
  return (
    <h2 className="mb-3 flex items-baseline gap-2 text-xl">
      {children} <span className="font-sans text-sm font-bold text-muted">{count}</span>
    </h2>
  );
}

/** Landscape "continue watching" card: 2 per row on phones, 4 on desktop. */
function ReadyCard({ card }: { card: SeriesCard }) {
  const watchNext = useWatchNext();
  const next = card.next;
  const left = card.airedCount - card.watchedCount;
  // overflow-hidden clips the image and progress bar to the card's corners: a 4px-tall bar can't hold a 16px radius.
  return (
    <article className="relative overflow-hidden rounded-2xl border border-line/60 bg-surface shadow-lg shadow-black/20">
      <Link href={`/series/${card.seriesId}`} className="block">
        <div className="relative aspect-video">
          <Backdrop
            backdropPath={card.backdropPath}
            posterPath={card.posterPath}
            sizes="(min-width: 1024px) 240px, (min-width: 768px) 33vw, 50vw"
            className="h-full w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent" />
          <span className="absolute top-2 left-2 rounded-full bg-bg/70 px-2 py-0.5 text-[11px] font-bold text-muted backdrop-blur">
            {left} left
          </span>
          <div className="absolute inset-x-0 bottom-0 p-2.5 pr-12 sm:p-3 sm:pr-14">
            <h3 className="truncate text-sm leading-tight sm:text-base">{card.name}</h3>
            {next && (
              <p className="truncate text-xs text-muted">
                <span className="font-bold text-accent">{episodeCode(next)}</span>
                <span className="hidden sm:inline"> · {next.name}</span>
              </p>
            )}
          </div>
        </div>
        <div className="h-1 bg-raised">
          <div className="h-full bg-accent" style={{ width: `${card.airedCount ? (card.watchedCount / card.airedCount) * 100 : 0}%` }} />
        </div>
      </Link>
      <button
        aria-label={next ? `Mark ${episodeCode(next)} as watched` : "Mark next episode as watched"}
        disabled={watchNext.isPending}
        onClick={() => watchNext.mutate(card.seriesId)}
        className="absolute right-2 bottom-3.5 flex size-9 items-center justify-center rounded-full bg-accent text-accent-ink shadow-lg shadow-black/40 transition hover:bg-accent-strong active:scale-90 disabled:opacity-60 sm:right-2.5 sm:size-10"
      >
        <Check className="size-5" strokeWidth={3} />
      </button>
      {/* Same right edge as ✓ and centered on the same vertical line: 36px button, 40px ✓ from sm. */}
      <div className="absolute top-1.5 right-2 rounded-full bg-bg/60 backdrop-blur sm:right-3">
        <StatusMenu seriesId={card.seriesId} status={card.status} />
      </div>
    </article>
  );
}

const relativeDay = (date: string | null | undefined) => {
  if (!date) return "Date TBA";
  const days = Math.round((new Date(date).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  return new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

function UpcomingCard({ card }: { card: SeriesCard }) {
  // Details not fetched yet (e.g. right after an Import): a placeholder rather than "Series #123".
  if (!card.loaded) {
    return (
      <div className="space-y-2">
        <Skeleton className="aspect-[2/3] w-full" />
        <Skeleton className="h-3.5 w-3/4 rounded-full" />
      </div>
    );
  }
  return (
    <Link href={`/series/${card.seriesId}`} className="group space-y-1.5">
      <Poster path={card.posterPath} name={card.name} className="w-full transition group-hover:-translate-y-0.5" />
      <p className="truncate text-xs font-semibold sm:text-sm">{card.name}</p>
      {/* Date and episode on their own lines: "S02E06 · In 2 days" wraps mid-date in a 4-column grid. */}
      <p
        className={cx(
          "flex items-center gap-1 text-[11px] leading-tight font-bold sm:text-xs",
          card.next?.airDate ? "text-accent" : "text-muted",
        )}
      >
        <Sparkles className="size-3 shrink-0" />
        <span className="truncate">{relativeDay(card.next?.airDate)}</span>
      </p>
      {card.next && <p className="text-[11px] leading-tight text-muted sm:text-xs">{episodeCode(card.next)}</p>}
    </Link>
  );
}
