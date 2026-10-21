import { useQuery } from "@tanstack/react-query";
import { episodeCode, type Home, type SeriesCard } from "@snug/shared";
import { Check, Coffee, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { api } from "../api";
import { StatusMenu, useWatchNext } from "../components/series-actions";
import { usePreferences } from "../components/preferences";
import { HomeSkeleton } from "../components/skeletons";
import {
  Backdrop,
  Button,
  cx,
  Empty,
  PageTitle,
  Poster,
  POSTER_ROW,
  POSTER_ROW_ITEM,
  POSTER_ROW_SIZES,
  Skeleton,
} from "../components/ui";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Cozy evening";
};

export function HomePage() {
  const { data, isPending } = useQuery({ queryKey: ["home"], queryFn: () => api<Home>("/home") });
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {data.ready.map((card) => (
              <ReadyCard key={card.seriesId} card={card} />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <SectionTitle count={upcoming.length}>Upcoming</SectionTitle>
          <div className="space-y-6">
            {upcomingGroups(upcoming).map((group) => (
              <div key={group.label}>
                {group.label && <h3 className="mb-2 font-sans text-sm font-bold text-muted">{group.label}</h3>}
                <div className={POSTER_ROW}>
                  {group.cards.map((card) => (
                    <UpcomingCard key={card.seriesId} card={card} />
                  ))}
                </div>
              </div>
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

/** "Continue watching" row: the whole name and next episode stay readable on a phone, ✓ under the thumb. */
function ReadyCard({ card }: { card: SeriesCard }) {
  const watchNext = useWatchNext();
  const next = card.next;
  const left = card.airedCount - card.watchedCount;
  return (
    <article className="relative flex items-stretch gap-3 rounded-2xl border border-line/60 bg-surface p-2.5 shadow-lg shadow-black/20 has-[[aria-expanded=true]]:z-40">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <Backdrop
          backdropPath={card.backdropPath}
          posterPath={card.posterPath}
          sizes="(min-width: 768px) 400px, 100vw"
          className="h-full w-full opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/90 to-surface/55" />
      </div>
      <Link href={`/series/${card.seriesId}`} className="relative flex min-w-0 flex-1 items-center gap-3">
        <Poster path={card.posterPath} name={card.name} sizes="64px" className="w-16 rounded-xl" />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-base leading-tight">{card.name}</h3>
          {next && (
            <p className="mt-0.5 truncate text-sm text-muted">
              <span className="font-bold text-accent">{episodeCode(next)}</span>
              {next.name && ` · ${next.name}`}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-raised">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${card.airedCount ? (card.watchedCount / card.airedCount) * 100 : 0}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-semibold text-muted tabular-nums">{left} left</span>
          </div>
        </div>
      </Link>
      <div className="relative flex shrink-0 flex-col items-center justify-between">
        <StatusMenu seriesId={card.seriesId} status={card.status} />
        <button
          aria-label={next ? `Mark ${episodeCode(next)} as watched` : "Mark next episode as watched"}
          disabled={watchNext.isPending}
          onClick={() => watchNext.mutate(card.seriesId)}
          className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-ink shadow-lg shadow-black/40 transition hover:bg-accent-strong active:scale-90 disabled:opacity-60"
        >
          <Check className="size-5" strokeWidth={3} />
        </button>
      </div>
    </article>
  );
}

const daysUntil = (date: string) =>
  Math.round((new Date(date).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000);

/** This week, later, then undated; no heading when everything falls in one group. */
const upcomingGroups = (cards: SeriesCard[]) => {
  const groups = [
    { label: "This week", cards: cards.filter((c) => c.next?.airDate && daysUntil(c.next.airDate) < 7) },
    { label: "Later", cards: cards.filter((c) => c.next?.airDate && daysUntil(c.next.airDate) >= 7) },
    { label: "Date TBA", cards: cards.filter((c) => !c.next?.airDate) },
  ].filter((g) => g.cards.length);
  return groups.length === 1 ? [{ label: "", cards: groups[0]!.cards }] : groups;
};

const relativeDay = (date: string | null | undefined) => {
  if (!date) return "Date TBA";
  const days = daysUntil(date);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  return new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

function UpcomingCard({ card }: { card: SeriesCard }) {
  // Details not fetched yet (e.g. right after an Import): a placeholder rather than "Series #123".
  if (!card.loaded) {
    return (
      <div className={cx(POSTER_ROW_ITEM, "space-y-2")}>
        <Skeleton className="aspect-[2/3] w-full" />
        <Skeleton className="h-3.5 w-3/4 rounded-full" />
      </div>
    );
  }
  return (
    <Link href={`/series/${card.seriesId}`} className={cx(POSTER_ROW_ITEM, "group space-y-1.5")}>
      <Poster
        path={card.posterPath}
        name={card.name}
        sizes={POSTER_ROW_SIZES}
        className="w-full transition group-hover:-translate-y-0.5"
      />
      <p className="truncate text-sm font-semibold">{card.name}</p>
      <p className="flex items-center gap-1 text-xs font-bold text-accent">
        <Sparkles className="size-3 shrink-0" />
        <span className="truncate">{relativeDay(card.next?.airDate)}</span>
      </p>
      {card.next && <p className="text-xs text-muted">{episodeCode(card.next)}</p>}
    </Link>
  );
}
