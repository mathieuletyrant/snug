import { useQuery } from "@tanstack/react-query";
import { Coffee } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { usePreferences } from "@/components/preferences";
import { PickSheet } from "@/components/series/pick-sheet";
import { ReadyCard } from "@/components/series/ready-card";
import { ReadyCarousel, useColumns } from "@/components/series/ready-carousel";
import { LayoutSwitch, useReadyLayout } from "@/components/series/ready-layout";
import { ReadyRow } from "@/components/series/ready-row";
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
  const [chosenLayout, setLayout] = useReadyLayout();
  const [page, setPage] = useState(0);
  const columns = useColumns();

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

  // A computer screen fits the cards grid well: no switch there, the phone's choice stays for the phone.
  const wide = columns === 4;
  const layout = wide ? "cards" : chosenLayout;
  const pages = pageTotal(data.ready.length, columns);
  const currentPage = Math.min(page, pages - 1);

  return (
    <>
      <PageTitle>{greeting(t)}</PageTitle>

      {data.ready.length > 0 && (
        <section className="mb-10">
          <SectionTitle
            count={data.ready.length}
            action={
              wide
                ? showPick && <PickSheet ready={data.ready} />
                : layout === "carousel" &&
                  pages > 1 && <span className="text-sm font-bold text-muted">{t.home.layout.page(currentPage + 1, pages)}</span>
            }
          >
            {t.home.ready}
          </SectionTitle>
          {!wide && (
            <div className="mb-4 flex items-center justify-between gap-3">
              {showPick && <PickSheet ready={data.ready} />}
              <div className="ml-auto">
                <LayoutSwitch value={layout} onChange={setLayout} />
              </div>
            </div>
          )}
          {layout === "cards" && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {data.ready.map((card) => (
                <ReadyCard key={card.seriesId} card={card} />
              ))}
            </div>
          )}
          {layout === "list" && (
            <ul className="divide-y divide-line/60 overflow-hidden rounded-2xl border border-line/60 bg-surface">
              {data.ready.map((card) => (
                <ReadyRow key={card.seriesId} card={card} />
              ))}
            </ul>
          )}
          {layout === "carousel" && <ReadyCarousel cards={data.ready} columns={columns} page={currentPage} onPage={setPage} />}
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

/** How many carousel pages: two rows of `columns` cards each. */
function pageTotal(cards: number, columns: number) {
  return Math.ceil(cards / (columns * 2));
}
