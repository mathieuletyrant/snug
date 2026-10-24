import { useQuery } from "@tanstack/react-query";
import type { SeriesCard } from "@snug/shared";
import { Coffee } from "lucide-react";
import { Link } from "wouter";
import { isNew } from "../components/airing";
import { usePreferences } from "../components/preferences";
import { ReadyCard } from "../components/series/ready-card";
import { UpcomingTile } from "../components/series/upcoming-tile";
import { HomeSkeleton } from "../components/skeletons";
import { Button, Empty, PageTitle, POSTER_GRID, SectionTitle } from "../components/ui";
import { greeting } from "../lib/format";
import { homeQuery } from "../queries";

export function HomePage() {
  const { data, isPending } = useQuery(homeQuery);
  const { hideUndatedUpcoming, newForDays } = usePreferences();

  if (isPending) return <HomeSkeleton />;
  const upcoming = (data?.upcoming ?? []).filter((c) => !hideUndatedUpcoming || !c.loaded || c.next?.airDate);
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

  // New mode: fresh Episodes first, the rest in the server's order (Saved up, then most recently watched).
  const fresh = (card: SeriesCard) => newForDays > 0 && isNew(card, newForDays);
  const ready = [...data.ready.filter(fresh), ...data.ready.filter((c) => !fresh(c))];

  return (
    <>
      <PageTitle>{greeting()}</PageTitle>

      {ready.length > 0 && (
        <section className="mb-10">
          <SectionTitle count={ready.length}>Ready to watch</SectionTitle>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {ready.map((card) => (
              <ReadyCard key={card.seriesId} card={card} fresh={fresh(card)} />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <SectionTitle count={upcoming.length}>Upcoming</SectionTitle>
          <div className={POSTER_GRID}>
            {upcoming.map((card) => (
              <UpcomingTile key={card.seriesId} card={card} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
