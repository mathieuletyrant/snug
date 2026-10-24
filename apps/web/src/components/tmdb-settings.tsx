import { useMutation, useQuery } from "@tanstack/react-query";
import { DEFAULT_LANGUAGE, LANGUAGES, type SetupState } from "@snug/shared";
import { api, queryClient } from "../api";
import { useForm } from "./form";
import { useToast } from "./toast";
import { Button, ErrorText, Input, Select } from "./ui";

/** The instance's TMDB key, checked against TMDB before it's saved. */
export function TmdbKeyForm() {
  const form = useForm({ key: "" });
  const save = useMutation({
    mutationFn: () => api("/settings/tmdb-key", { method: "PUT", body: form.values }),
    onSuccess: async () => {
      form.reset();
      await queryClient.invalidateQueries();
    },
    onError: form.fromError,
  });

  return (
    <form {...form.formProps} onSubmit={form.onSubmit(() => save.mutate())} className="space-y-4">
      <Input
        label="API key or read access token"
        required
        minLength={10}
        placeholder="eyJhbGciOi… or 32 characters"
        autoComplete="off"
        spellCheck={false}
        {...form.field("key")}
      />
      <ErrorText error={form.formError} />
      {save.isSuccess && <p className="text-sm text-sage">Saved.</p>}
      <Button disabled={save.isPending}>{save.isPending ? "Checking…" : "Save key"}</Button>
    </form>
  );
}

/** Instance-wide language of series details; changing it re-fetches every series in the background. */
export function LanguageSelect() {
  const toast = useToast();
  const { data: setup } = useQuery({ queryKey: ["setup"], queryFn: () => api<SetupState>("/setup") });
  const save = useMutation({
    mutationFn: (language: string) => api("/settings/language", { method: "PUT", body: { language } }),
    onSuccess: async (_, language) => {
      await queryClient.invalidateQueries({ queryKey: ["setup"] });
      const label = LANGUAGES.find((l) => l.code === language)?.label ?? language;
      toast({ message: `Switching to ${label}…` });
    },
    onError: (e) => toast({ message: e.message }),
  });

  return (
    <Select
      label="Language"
      hint="For descriptions, episode titles and posters. Falls back to English."
      value={setup?.language ?? DEFAULT_LANGUAGE}
      disabled={!setup || save.isPending}
      onChange={(e) => save.mutate(e.target.value)}
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </Select>
  );
}
