import { useMutation, useQuery } from "@tanstack/react-query";
import type { Me } from "@snug/shared";
import { api, queryClient } from "../../api";
import { useForm } from "../../components/form";
import { LanguageSelect, TmdbKeyForm } from "../../components/tmdb-settings";
import { useToast } from "../../components/toast";
import { Button, Card, CardHeader, ErrorText, Input } from "../../components/ui";

export function AdminSection() {
  return (
    <>
      <People />
      <Card className="space-y-5">
        <CardHeader title="Series details">From TMDB, for everyone on this Snug.</CardHeader>
        <LanguageSelect />
        <TmdbKeyForm />
      </Card>
    </>
  );
}

/** Sign-up closes after the first account: the admin creates the others. */
function People() {
  const toast = useToast();
  const { data } = useQuery({ queryKey: ["users"], queryFn: () => api<Omit<Me, "isAdmin">[]>("/users") });
  const form = useForm({ name: "", email: "", password: "" });
  const create = useMutation({
    mutationFn: () => api("/users", { body: form.values }),
    onSuccess: async () => {
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ message: "Account created" });
    },
    onError: form.fromError,
  });

  return (
    <Card>
      <CardHeader title="People">Sign-up is closed. Create accounts here.</CardHeader>
      <ul className="mb-5 space-y-1 text-sm">
        {data?.map((u) => (
          <li key={u.id}>
            <b>{u.name}</b> <span className="text-muted">{u.email}</span>
          </li>
        ))}
      </ul>
      <form {...form.formProps} onSubmit={form.onSubmit(() => create.mutate())} className="grid items-start gap-3 sm:grid-cols-3">
        <Input label="Name" required {...form.field("name")} />
        <Input label="Email" type="email" required {...form.field("email")} />
        <Input
          label="Password"
          type="password"
          minLength={10}
          required
          autoComplete="new-password"
          hint="At least 10 characters"
          {...form.field("password")}
        />
        <div className="space-y-3 sm:col-span-3">
          <ErrorText error={form.formError} />
          <Button disabled={create.isPending}>Create account</Button>
        </div>
      </form>
    </Card>
  );
}
