import { useState } from "react";
import { ApiError, authClient, queryClient } from "@/api";
import { useForm } from "@/components/form";
import { Button, Card, CenteredPage, ErrorText, Input } from "@/components/ui";
import { useT } from "@/i18n";

/** better-auth error codes that belong to a single field. */
const FIELD_OF_CODE: Record<string, string> = {
  USER_ALREADY_EXISTS: "email",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "email",
  INVALID_EMAIL: "email",
  PASSWORD_TOO_SHORT: "password",
  PASSWORD_TOO_LONG: "password",
};

/** Sign in, or create the admin account on first run. */
export function AuthPage({ firstRun }: { firstRun: boolean }) {
  const t = useT();
  const form = useForm({ name: "", email: "", password: "" });
  const [pending, setPending] = useState(false);

  const submit = async () => {
    setPending(true);
    const { name, email, password } = form.values;
    const { error } = firstRun
      ? await authClient.signUp.email({ name, email, password })
      : await authClient.signIn.email({ email, password });
    setPending(false);
    if (!error) return queryClient.invalidateQueries();
    const field = FIELD_OF_CODE[error.code ?? ""];
    const message = error.status === 429 ? t.auth.tooManyAttempts : (error.message ?? t.common.somethingWrong);
    form.fromError(new ApiError(error.status, message, field ? { [field]: message } : undefined));
  };

  return (
    <CenteredPage
      icon={<img src="/icon.svg" alt="" className="size-16 rounded-2xl" />}
      title={firstRun ? t.auth.welcome : t.auth.welcomeBack}
      intro={firstRun ? t.auth.firstRunIntro : t.auth.signInIntro}
    >
      <Card>
        <form {...form.formProps} onSubmit={form.onSubmit(submit)} className="space-y-4">
          {firstRun && <Input label={t.auth.name} required autoComplete="name" {...form.field("name")} />}
          <Input label={t.auth.email} type="email" required autoComplete="email" {...form.field("email")} />
          <Input
            label={t.auth.password}
            type="password"
            required
            minLength={firstRun ? 10 : undefined}
            autoComplete={firstRun ? "new-password" : "current-password"}
            hint={firstRun ? t.auth.passwordHint : undefined}
            {...form.field("password")}
          />
          <ErrorText error={form.formError} />
          <Button className="w-full" disabled={pending}>
            {firstRun ? t.auth.createAccount : t.auth.signIn}
          </Button>
        </form>
      </Card>
    </CenteredPage>
  );
}
