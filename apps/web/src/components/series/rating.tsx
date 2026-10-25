import { useMutation } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Popover } from "radix-ui";
import { useState } from "react";
import { api, queryClient } from "@/api";
import { useT } from "@/i18n";
import { useToast } from "@/components/toast";
import { COLLISION_PADDING, cx } from "@/components/ui";

/**
 * A Series' (or a season's) rating out of 10: a small pill showing it, opening a 1–10 pad.
 * `small` for a season header: the rating in an accent dot, or a quiet "Rate".
 */
export function RatingButton({
  path,
  rating,
  label,
  small = false,
  onImage = false,
  quiet = false,
}: {
  path: string;
  rating: number | null;
  label: string;
  small?: boolean;
  /** Over a poster: a solid backdrop so it reads on any image. */
  onImage?: boolean;
  /** In a list of seasons: no pill, a grey star until rated, then "★ 8". */
  quiet?: boolean;
}) {
  const t = useT();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const rate = useMutation({
    mutationFn: (value: number | null) => api(path, { method: "PUT", body: { rating: value } }),
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (e) => toast({ message: e.message }),
  });
  const shown = rate.isPending ? (rate.variables ?? null) : rating;
  const pick = (value: number | null) => {
    rate.mutate(value);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={shown ? `${label} : ${shown}/10` : label}
        className={cx(
          // Same height rated or not, so rows don't jump.
          "inline-flex shrink-0 items-center gap-1 rounded-full leading-none font-bold transition",
          !quiet && (small ? "h-7 px-2.5 text-xs" : "h-9 px-3.5 text-sm"),
          quiet
            ? cx(
                "h-8 px-2 text-sm",
                shown ? "text-accent hover:bg-raised" : "text-muted/70 hover:bg-raised hover:text-accent",
              )
            : onImage
              ? "bg-bg/85 text-accent shadow-md shadow-black/40 backdrop-blur-sm hover:bg-bg"
              : shown
                ? "bg-accent/15 text-accent hover:bg-accent/25"
                : "border border-accent/50 text-accent hover:bg-accent/10",
        )}
      >
        <Star className={cx(small ? "size-3.5" : "size-4", !!shown && "fill-current")} />
        {shown ? (
          <span>
            {shown}
            {!quiet && <span className="font-semibold opacity-60">/10</span>}
          </span>
        ) : (
          !quiet && t.series.rate
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={small ? "end" : "start"}
          sideOffset={6}
          collisionPadding={COLLISION_PADDING}
          className="z-50 w-64 rounded-2xl border border-line bg-raised p-3 shadow-2xl shadow-black/50 data-[state=open]:animate-pop-in"
        >
          <p className="mb-2 px-1 text-xs font-semibold text-muted">{label}</p>
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={shown === n}
                aria-label={t.series.rateAs(n)}
                onClick={() => pick(n)}
                className={cx(
                  "h-10 rounded-xl text-sm font-bold transition active:scale-95",
                  shown === n ? "bg-accent text-accent-ink" : "bg-surface hover:bg-line",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          {shown && (
            <button
              type="button"
              onClick={() => pick(null)}
              className="mt-2 w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-muted hover:bg-line hover:text-text"
            >
              {t.series.clearRating}
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
