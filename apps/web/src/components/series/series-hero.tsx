import { episodeCode, type SeriesDetail } from "@snug/shared";
import type { ReactNode } from "react";
import { image } from "../../api";
import { useT } from "../../i18n";
import { BackButton, Poster, ProgressBar } from "../ui";

/**
 * The top of a series page: its backdrop faded into the page, poster, name and progress, then `children`
 * (actions, overview). Phones: poster + title, then children full width. Desktop: everything right of the poster.
 */
export function SeriesHero({ series, children }: { series: SeriesDetail; children: ReactNode }) {
  const t = useT();
  const backdrop = image(series.backdropPath, "w1280");
  return (
    <>
      {backdrop && (
        <div
          aria-hidden
          className="backdrop-fade pointer-events-none absolute -top-6 left-1/2 -z-10 h-80 w-screen -translate-x-1/2 md:-top-10 md:h-[30rem]"
        >
          <img src={backdrop} alt="" className="h-full w-full object-cover object-[50%_25%] opacity-60" />
        </div>
      )}
      <BackButton />
      <div className="mt-20 grid grid-cols-[7rem_minmax(0,1fr)] gap-x-5 gap-y-6 md:mt-36 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-x-8">
        <Poster
          path={series.posterPath}
          name={series.name}
          className="w-full self-start md:row-span-2"
          sizes="(min-width: 768px) 160px, 112px"
          eager
        />
        <header className="flex flex-col justify-end gap-2 md:justify-start md:pt-6">
          <h1 className="text-3xl leading-tight font-semibold md:text-5xl">{series.name}</h1>
          <p className="text-sm text-muted">
            {series.year ?? "—"} · {series.ended ? t.series.ended : t.series.airing}
            {series.progress && ` · ${t.series.at(episodeCode(series.progress))}`}
          </p>
          {series.airedCount > 0 && (
            <ProgressBar value={series.watchedCount} max={series.airedCount} className="max-w-xs" />
          )}
        </header>
        <div className="col-span-2 space-y-5 md:col-span-1 md:col-start-2">{children}</div>
      </div>
    </>
  );
}
