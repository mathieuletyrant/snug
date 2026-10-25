import { useMutation, useQuery } from "@tanstack/react-query";
import type { Me } from "@snug/shared";
import { api, queryClient } from "@/api";
import { useForm } from "@/components/form";
import { LanguageSelect, TmdbKeyForm } from "@/components/tmdb-settings";
import { useToast } from "@/components/toast";
import { Button, Card, CardHeader, ErrorText, Input } from "@/components/ui";
import { useT } from "@/i18n";

export function AdminSection() {
  const t = useT();
  return (
    <>
      <People />
      <Card className="space-y-5">
        <CardHeader title={t.admin.seriesDetails}>{t.admin.seriesDetailsHelp}</CardHeader>
        <LanguageSelect />
        <TmdbKeyForm />
      </Card>
    </>
  );
}

/** Sign-up closes after the first account: the admin creates the others. */
function People() {
  const toast = useToast();
  const t = useT();
  const { data } = useQuery({ queryKey: ["users"], queryFn: () => api<Omit<Me, "isAdmin">[]>("/users") });
  const form = useForm({ name: "", email: "", password: "" });
  const create = useMutation({
    mutationFn: () => api("/users", { body: form.values }),
    onSuccess: async () => {
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ message: t.admin.accountCreated });
    },
    onError: form.fromError,
  });

  return (
    <Card>
      <CardHeader title={t.admin.people}>{t.admin.peopleHelp}</CardHeader>
      <ul className="mb-5 space-y-1 text-sm">
        {data?.map((user) => (
          <li key={user.id}>
            <b>{user.name}</b> <span className="text-muted">{user.email}</span>
          </li>
        ))}
      </ul>
      <form {...form.formProps} onSubmit={form.onSubmit(() => create.mutate())} className="grid items-start gap-3 sm:grid-cols-3">
        <Input label={t.auth.name} required {...form.field("name")} />
        <Input label={t.auth.email} type="email" required {...form.field("email")} />
        <Input
          label={t.auth.password}
          type="password"
          minLength={10}
          required
          autoComplete="new-password"
          hint={t.auth.passwordHint}
          {...form.field("password")}
        />
        <div className="space-y-3 sm:col-span-3">
          <ErrorText error={form.formError} />
          <Button disabled={create.isPending}>{t.auth.createAccount}</Button>
        </div>
      </form>
    </Card>
  );
}
