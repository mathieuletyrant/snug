import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { api, queryClient } from "@/api";
import { useT } from "@/i18n";

/** Numbered instructions, folded once set up so the page stays short on a phone. */
export function SetupSteps({ open = false, children }: { open?: boolean; children: ReactNode }) {
  const t = useT();
  return (
    <details open={open} className="group mb-4">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-bold text-accent">
        {t.integrations.howToConnect}
        <ChevronDown className="size-4 transition group-open:rotate-180" />
      </summary>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">{children}</ol>
    </details>
  );
}

/** Puts a menu, button or option name in bold in a setup step. */
export const bold = (text: string) => <b className="text-text">{text}</b>;

/** A setup step from the catalog, with its names in bold. */
export const steps = (list: readonly ((b: typeof bold) => ReactNode)[]) =>
  list.map((step, i) => <li key={i}>{step(bold)}</li>);

/** An integration's settings from `path`, and replacing its secret URL (`path/rotate`). */
export function useIntegration<T>(path: string, refetchInterval?: number) {
  const queryKey = ["integration", path];
  const query = useQuery({ queryKey, queryFn: () => api<T>(path), refetchInterval });
  const rotate = useMutation({
    mutationFn: () => api(`${path}/rotate`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
  return { data: query.data, rotate: () => rotate.mutate() };
}
