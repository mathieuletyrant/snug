import { useMutation, useQuery } from "@tanstack/react-query";
import { DEFAULT_PREFERENCES, type Preferences } from "@snug/shared";
import { Switch } from "radix-ui";
import { useId } from "react";
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
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <label htmlFor={id} className="cursor-pointer">
        <span className="block font-semibold">{label}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </label>
      <Switch.Root
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="relative h-7 w-12 shrink-0 cursor-pointer rounded-full bg-line transition data-[state=checked]:bg-accent"
      >
        <Switch.Thumb className="block size-5 translate-x-1 rounded-full bg-text shadow transition-transform data-[state=checked]:translate-x-6" />
      </Switch.Root>
    </div>
  );
}
