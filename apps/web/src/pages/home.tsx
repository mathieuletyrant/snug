import { useQuery } from "@tanstack/react-query";
import { Coffee } from "lucide-react";
import { Link } from "wouter";
import { usePreferences } from "@/components/preferences";
import { PickSheet } from "@/components/series/pick-sheet";
import { ReadyCard } from "@/components/series/ready-card";
import { UpcomingTile } from "@/components/series/upcoming-tile";
import { HomeSkeleton } from "@/components/skeletons";
import { Button, Empty, PageTitle, POSTER_GRID, SectionTitle } from "@/components/ui";
import { useT } from "@/i18n";
import { greeting } from "@/lib/format";
import { homeQuery } from "@/queries";

export function HomePage() {
  const { data, isPending } = useQuery(homeQuery);
  const t = useT();
  const { showPick } = usePreferences();

  if (isPending) return <HomeSkeleton />;
  if (!data || (!data.ready.length && !data.upcoming.length)) {
    return (
      <>
        <PageTitle>{greeting(t)}</PageTitle>
        <Empty icon={<Coffee className="size-10" />} title={t.home.emptyTitle}>
          {t.home.emptyBody}
          <div className="mt-5">
            <Link href="/search">
              <Button>{t.home.findSeries}</Button>
            </Link>
          </div>
        </Empty>
      </>
    );
  }

  return (
    <>
      <PageTitle>{greeting(t)}</PageTitle>

      {data.ready.length > 0 && (
        <section className="mb-10">
          <SectionTitle count={data.ready.length} action={showPick && <PickSheet ready={data.ready} />}>
            {t.home.ready}
          </SectionTitle>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {data.ready.map((card) => (
              <ReadyCard key={card.seriesId} card={card} />
            ))}
          </div>
        </section>
      )}

      {data.upcoming.length > 0 && (
        <section>
          <SectionTitle count={data.upcoming.length}>{t.home.upcoming}</SectionTitle>
          <div className={POSTER_GRID}>
            {data.upcoming.map((card) => (
              <UpcomingTile key={card.seriesId} card={card} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
