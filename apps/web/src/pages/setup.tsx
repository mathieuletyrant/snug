import { useMutation, useQuery } from "@tanstack/react-query";
import { DEFAULT_LANGUAGE, LANGUAGES, type Me, type SetupState } from "@snug/shared";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { api, queryClient } from "../api";
import { useFormErrors } from "../components/form";
import { useToast } from "../components/toast";
import { Button, Card, ErrorText, Input, Select } from "../components/ui";

export function TmdbKeyForm() {
  const [key, setKey] = useState("");
  const { errors, formError, onSubmit, fromError, clear, formProps } = useFormErrors();
  const save = useMutation({
    mutationFn: () => api("/settings/tmdb-key", { method: "PUT", body: { key } }),
    onSuccess: async () => {
      setKey("");
      await queryClient.invalidateQueries();
    },
    onError: fromError,
  });

  return (
    <form {...formProps} onSubmit={onSubmit(() => save.mutate())} className="space-y-4">
      <Input
        label="API key or read access token"
        name="key"
        required
        minLength={10}
        value={key}
        onChange={(e) => {
          setKey(e.target.value);
          clear("key");
        }}
        error={errors.key}
        placeholder="eyJhbGciOi… or 32 characters"
        autoComplete="off"
        spellCheck={false}
      />
      <ErrorText error={formError} />
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

/** Shown after the first sign-up until the instance has a TMDB key. */
export function SetupPage({ me }: { me: Me }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
        <KeyRound className="size-7" />
      </div>
      <h1 className="mb-2 text-3xl font-semibold">One last thing</h1>
      {me.isAdmin ? (
        <>
          <p className="mb-6 text-muted">
            Snug gets series, posters and episodes from TMDB. Create a free key at{" "}
            <a className="text-accent underline" href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">
              themoviedb.org/settings/api
            </a>{" "}
            and paste it here.
          </p>
          <Card className="space-y-5">
            <LanguageSelect />
            <TmdbKeyForm />
          </Card>
        </>
      ) : (
        <p className="text-muted">Your admin hasn't set up the TMDB key yet. Come back in a bit.</p>
      )}
    </div>
  );
}
