import { useMutation, useQuery } from "@tanstack/react-query";
import type { SeriesDetail } from "@snug/shared";
import { useLocation } from "wouter";
import { api, queryClient } from "@/api";
import { Confirm } from "@/components/confirm";
import { SavingPanel } from "@/components/series/saving-panel";
import { Season } from "@/components/series/season";
import { SeriesHero } from "@/components/series/series-hero";
import { StatusPicker } from "@/components/series/status-picker";
import { SeriesSkeleton } from "@/components/skeletons";
import { useToast } from "@/components/toast";
import { Button, ErrorText, Toggle } from "@/components/ui";
import { useT } from "@/i18n";

export function SeriesPage({ id }: { id: string }) {
  const { data, isPending, error } = useQuery({ queryKey: ["series", id], queryFn: () => api<SeriesDetail>(`/series/${id}`) });
  const [, navigate] = useLocation();
  const toast = useToast();
  const t = useT();
  const remove = useMutation({
    mutationFn: () => api(`/series/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast({ message: t.series.removed });
      navigate("/library");
    },
  });
  const numbering = useMutation({
    mutationFn: (on: boolean) => api(`/series/${id}/absolute-numbering`, { method: "PUT", body: { on } }),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  if (isPending) return <SeriesSkeleton />;
  if (!data) return <ErrorText error={error} />;

  return (
    <article className="relative">
      <SeriesHero series={data}>
        <StatusPicker series={data} />
        {data.tracked && data.saving && <SavingPanel seriesId={data.seriesId} saving={data.saving} />}
        {data.overview && <p className="leading-relaxed text-muted">{data.overview}</p>}
      </SeriesHero>

      <div className="mt-8 space-y-3">
        {data.seasons.map((season) => (
          <Season key={season.number} series={data} season={season} />
        ))}
      </div>

      {data.tracked && (
        <div className="mt-10 space-y-6">
          <div className="rounded-3xl border border-line/60 bg-surface/80 px-4 py-2">
            <Toggle
              label={t.series.absoluteNumbering}
              description={t.series.absoluteNumberingHint}
              checked={numbering.isPending ? numbering.variables : data.absoluteNumbering}
              onChange={(on) => numbering.mutate(on)}
            />
          </div>
          <Confirm
            title={t.series.removeTitle(data.name)}
            description={t.series.removeBody}
            confirm={t.series.removeConfirm}
            onConfirm={() => remove.mutate()}
          >
            <Button variant="danger">{t.series.remove}</Button>
          </Confirm>
        </div>
      )}
    </article>
  );
}
