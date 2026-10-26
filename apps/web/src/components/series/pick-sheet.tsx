import { type SeriesCard, TIME_BUDGETS, type TimeBudget } from "@snug/shared";
import { Hourglass, Shuffle } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Sheet } from "@/components/sheet";
import { Backdrop, Badge, Button, Chips } from "@/components/ui";
import { useT } from "@/i18n";
import { episodeLabel } from "@/lib/format";
import { type Pick, picks, shortest } from "@/lib/pick";

const BUDGET_KEY = "snug.timeBudget";

/** The last Time budget, per device: the TV evening is not the phone's. */
function storedBudget(): TimeBudget {
  try {
    const stored = Number(localStorage.getItem(BUDGET_KEY));
    return TIME_BUDGETS.find((budget) => budget === stored) ?? 30;
  } catch {
    return 30;
  }
}

/** "I have 25 minutes": one Pick among the Ready cards, rerolled at will. Only proposes, marks nothing. */
export function PickSheet({ ready }: { ready: SeriesCard[] }) {
  const t = useT();
  const [budget, setBudget] = useState(storedBudget);
  const [index, setIndex] = useState(0);
  const list = useMemo(() => picks(ready, budget), [ready, budget]);

  const choose = (minutes: string) => {
    const next = Number(minutes) as TimeBudget;
    setBudget(next);
    setIndex(0);
    try {
      localStorage.setItem(BUDGET_KEY, String(next));
    } catch {}
  };
  // A random other one, never the one on screen.
  const reroll = () => setIndex((current) => (current + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length);

  const pick = list[index] ?? list[0];
  const fallback = pick ? null : shortest(ready);
  return (
    <Sheet
      title={t.home.pick.title}
      trigger={
        <button className="flex shrink-0 items-center gap-1.5 rounded-full bg-raised px-3 py-1 text-sm font-bold text-muted transition hover:text-text">
          <Hourglass className="size-4" />
          {t.home.pick.trigger(budget)}
        </button>
      }
    >
      <Chips
        label={t.home.pick.budget}
        value={String(budget)}
        onChange={choose}
        options={TIME_BUDGETS.map((minutes) => ({ value: String(minutes), label: t.home.pick.minutes(minutes) }))}
      />
      <div className="mt-5">
        {pick ? (
          <>
            <PickCard pick={pick} />
            {list.length > 1 && (
              <Button variant="ghost" onClick={reroll} className="mt-3 w-full">
                <Shuffle className="size-4" />
                {t.home.pick.another}
              </Button>
            )}
          </>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted">
              {t.home.pick.nothing(budget)} {fallback && t.home.pick.shortest}
            </p>
            {fallback && <PickCard pick={fallback} />}
          </>
        )}
      </div>
    </Sheet>
  );
}

function PickCard({ pick: { card, episodes, minutes } }: { pick: Pick }) {
  const t = useT();
  const first = episodes[0]!;
  const last = episodes.at(-1)!;
  const range = [first, ...(episodes.length > 1 ? [last] : [])].map((episode) => episodeLabel(t, episode, card.absoluteNumbering)).join(" → ");
  return (
    <Link href={`/series/${card.seriesId}`} className="block overflow-hidden rounded-2xl border border-line/60 bg-surface">
      <div className="relative aspect-video">
        <Backdrop backdropPath={card.backdropPath} posterPath={card.posterPath} sizes="384px" className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent" />
        <div className="absolute top-2 left-2 flex gap-1">
          {card.saving && <Badge tone="accent">{t.home.savedUp}</Badge>}
          {!card.saving && card.fresh && <Badge tone="accent">{t.home.new}</Badge>}
          {last.seasonEnd && <Badge>{t.home.pick.seasonEnd}</Badge>}
        </div>
        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="truncate text-base leading-tight">{card.name}</h3>
          <p className="truncate text-xs text-muted">
            <span className="font-bold text-accent">{range}</span>
            {" · "}
            {t.common.duration(minutes)}
          </p>
        </div>
      </div>
    </Link>
  );
}
