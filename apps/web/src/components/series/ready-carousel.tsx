import type { SeriesCard } from "@snug/shared";
import { useRef, useSyncExternalStore } from "react";
import { cx } from "@/components/ui";
import { useT } from "@/i18n";
import { ReadyCard } from "./ready-card";

/** Columns of the cards grid at the current width: 2 on a phone, 3 from md, 4 from lg, as in Cards. */
export function useColumns() {
  return useSyncExternalStore(
    (onChange) => {
      const queries = [matchMedia("(min-width: 768px)"), matchMedia("(min-width: 1024px)")];
      for (const query of queries) query.addEventListener("change", onChange);
      return () => {
        for (const query of queries) query.removeEventListener("change", onChange);
      };
    },
    () => {
      if (matchMedia("(min-width: 1024px)").matches) return 4;
      if (matchMedia("(min-width: 768px)").matches) return 3;
      return 2;
    },
  );
}

/** Pages of two rows of cards, swiped one whole page at a time. */
export function ReadyCarousel({
  cards,
  columns,
  page,
  onPage,
}: {
  cards: SeriesCard[];
  columns: number;
  page: number;
  onPage: (page: number) => void;
}) {
  const t = useT();
  const scroller = useRef<HTMLDivElement>(null);
  const perPage = columns * 2;
  const pages: SeriesCard[][] = [];
  for (let i = 0; i < cards.length; i += perPage) pages.push(cards.slice(i, i + perPage));

  const onScroll = () => {
    const element = scroller.current;
    if (!element) return;
    const current = Math.round(element.scrollLeft / element.clientWidth);
    if (current !== page) onPage(current);
  };
  const goTo = (index: number) => {
    const element = scroller.current;
    element?.scrollTo({ left: index * element.clientWidth, behavior: "smooth" });
  };

  return (
    <>
      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {pages.map((items, index) => (
          <div
            key={index}
            aria-label={t.home.layout.pageOf(index + 1, pages.length)}
            className="grid w-full shrink-0 snap-start snap-always grid-cols-2 content-start gap-3 md:grid-cols-3 lg:grid-cols-4"
          >
            {items.map((card) => (
              <ReadyCard key={card.seriesId} card={card} />
            ))}
          </div>
        ))}
      </div>
      {pages.length > 1 && (
        <div className="mt-3 flex justify-center gap-1">
          {pages.map((items, index) => (
            <button
              key={index}
              aria-label={t.home.layout.pageOf(index + 1, pages.length)}
              aria-current={index === page}
              onClick={() => goTo(index)}
              className="flex h-6 items-center px-0.5"
            >
              <span className={cx("h-1.5 rounded-full transition-all", index === page ? "w-4.5 bg-accent" : "w-1.5 bg-line")} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}

