import { useMutation, useQuery } from "@tanstack/react-query";
import type { SeriesDetail } from "@snug/shared";
import { useLocation } from "wouter";
import { api, queryClient } from "../api";
import { Confirm } from "../components/confirm";
import { SavingPanel } from "../components/series/saving-panel";
import { Season } from "../components/series/season";
import { SeriesHero } from "../components/series/series-hero";
import { StatusPicker } from "../components/series/status-picker";
import { SeriesSkeleton } from "../components/skeletons";
import { useToast } from "../components/toast";
import { Button, ErrorText } from "../components/ui";

export function SeriesPage({ id }: { id: string }) {
  const { data, isPending, error } = useQuery({ queryKey: ["series", id], queryFn: () => api<SeriesDetail>(`/series/${id}`) });
  const [, navigate] = useLocation();
  const toast = useToast();
  const remove = useMutation({
    mutationFn: () => api(`/series/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast({ message: "Removed from your library" });
      navigate("/library");
    },
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
        <div className="mt-10">
          <Confirm
            title={`Remove ${data.name}?`}
            description="Its status and every episode you marked watched are deleted from Snug."
            confirm="Remove"
            onConfirm={() => remove.mutate()}
          >
            <Button variant="danger">Remove from library</Button>
          </Confirm>
        </div>
      )}
    </article>
  );
}
