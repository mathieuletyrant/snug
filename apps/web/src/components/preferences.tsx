import { useMutation, useQuery } from "@tanstack/react-query";
import { DEFAULT_PREFERENCES, type Preferences } from "@snug/shared";
import { api, queryClient } from "@/api";

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
