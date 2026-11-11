import type { SeriesCard } from "@snug/shared";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui";
import { useT } from "@/i18n";
import { ReadyCard } from "./ready-card";

/**
 * Pages of two rows of cards, swiped one whole page at a time. The page on screen is read from the scroll position
 * only, so it stays right when cards come and go or the screen turns; `onPage` reports it for the section's title.
 */
export function ReadyCarousel({
  cards,
  columns,
  onPage,
}: {
  cards: SeriesCard[];
  columns: number;
  onPage: (page: number, total: number) => void;
}) {
  const t = useT();
  const scroller = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const perPage = columns * 2;
  const pages: SeriesCard[][] = [];
  for (let i = 0; i < cards.length; i += perPage) pages.push(cards.slice(i, i + perPage));

  const readPage = () => {
    const element = scroller.current;
    if (element && element.clientWidth > 0) setPage(Math.round(element.scrollLeft / element.clientWidth));
  };

  // A resize or a page that disappears moves the scroll position without a scroll event.
  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const observer = new ResizeObserver(readPage);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(readPage, [pages.length]);
  useEffect(() => onPage(page, pages.length), [onPage, page, pages.length]);

  const goTo = (index: number) => {
    const element = scroller.current;
    element?.scrollTo({ left: index * element.clientWidth, behavior: "smooth" });
  };

  return (
    <>
      <div ref={scroller} onScroll={readPage} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
        {pages.map((items, index) => (
          <div
            key={index}
            role="group"
            aria-roledescription={t.home.layout.slide}
            aria-label={t.home.layout.pageOf(index + 1, pages.length)}
            className="grid w-full shrink-0 snap-start snap-always grid-cols-2 content-start gap-3 md:grid-cols-3"
          >
            {items.map((card) => (
              <ReadyCard key={card.seriesId} card={card} />
            ))}
          </div>
        ))}
      </div>
      {pages.length > 1 && (
        <div className="mt-2 flex justify-center">
          {pages.map((_page, index) => (
            <button
              key={index}
              aria-label={t.home.layout.pageOf(index + 1, pages.length)}
              aria-current={index === page ? "step" : undefined}
              onClick={() => goTo(index)}
              className="flex size-7 items-center justify-center"
            >
              <span className={cx("h-1.5 rounded-full transition-all", index === page ? "w-4.5 bg-accent" : "w-1.5 bg-line")} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
