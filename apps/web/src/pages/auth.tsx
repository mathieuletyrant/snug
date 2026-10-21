import { useState } from "react";
import { ApiError, authClient, queryClient } from "../api";
import { useFormErrors } from "../components/form";
import { Button, Card, ErrorText, Input } from "../components/ui";

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
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [pending, setPending] = useState(false);
  const { errors, formError, onSubmit, fromError, clear, formProps } = useFormErrors();

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [field]: e.target.value });
    clear(field);
  };

  const submit = async () => {
    setPending(true);
    const { error } = firstRun
      ? await authClient.signUp.email(form)
      : await authClient.signIn.email({ email: form.email, password: form.password });
    setPending(false);
    if (!error) return queryClient.invalidateQueries();
    const field = FIELD_OF_CODE[error.code ?? ""];
    const message = error.status === 429 ? "Too many attempts, wait a minute and try again" : (error.message ?? "Something went wrong");
    fromError(new ApiError(error.status, message, field ? { [field]: message } : undefined));
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <img src="/icon.svg" alt="" className="mb-6 size-16 rounded-2xl" />
      <h1 className="mb-1 text-4xl font-semibold">{firstRun ? "Welcome to Snug" : "Welcome back"}</h1>
      <p className="mb-8 text-muted">
        {firstRun ? "Create your account. You'll be the admin of this Snug." : "Grab a blanket and sign in."}
      </p>
      <Card>
        <form {...formProps} onSubmit={onSubmit(submit)} className="space-y-4">
          {firstRun && (
            <Input label="Name" name="name" required autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} />
          )}
          <Input
            label="Email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={set("email")}
            error={errors.email}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            required
            minLength={firstRun ? 10 : undefined}
            autoComplete={firstRun ? "new-password" : "current-password"}
            value={form.password}
            onChange={set("password")}
            error={errors.password}
            hint={firstRun ? "At least 10 characters" : undefined}
          />
          <ErrorText error={formError} />
          <Button className="w-full" disabled={pending}>
            {firstRun ? "Create account" : "Sign in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
