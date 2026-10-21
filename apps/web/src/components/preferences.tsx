import { useMutation, useQuery } from "@tanstack/react-query";
import { DEFAULT_PREFERENCES, type Preferences } from "@snug/shared";
import { api, queryClient } from "../api";

const KEY = ["preferences"];

export function usePreferences(): Preferences {
  const { data } = useQuery({ queryKey: KEY, queryFn: () => api<Preferences>("/preferences"), staleTime: Infinity });
  return data ?? DEFAULT_PREFERENCES;
}

/** Applied instantly, rolled back if the server refuses. */
export function useUpdatePreferences() {
  return useMutation({
    mutationFn: (changes: Partial<Preferences>) => api<Preferences>("/preferences", { method: "PATCH", body: changes }),
    onMutate: (changes) => {
      const previous = queryClient.getQueryData<Preferences>(KEY);
      queryClient.setQueryData<Preferences>(KEY, { ...DEFAULT_PREFERENCES, ...previous, ...changes });
      return previous;
    },
    onError: (_e, _changes, previous) => queryClient.setQueryData(KEY, previous),
    onSuccess: (saved) => queryClient.setQueryData(KEY, saved),
  });
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
      <span>
        <span className="block font-semibold">{label}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-accent" : "bg-line"}`}
      >
        <span
          className={`absolute top-1 left-1 size-5 rounded-full bg-text shadow transition-transform ${checked ? "translate-x-5" : ""}`}
        />
      </button>
    </label>
  );
}
