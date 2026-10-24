import { type ChangeEvent, type FormEvent, useState } from "react";
import { ApiError } from "../api";

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** Our own wording for the browser's constraint checks (its messages follow the OS language, not the app's). */
function messageFor(el: Field): string {
  const v = el.validity;
  const label = el.dataset.label ?? "This field";
  if (v.valueMissing) return `${label} is required`;
  if (v.typeMismatch && el.type === "email") return "Enter a valid email, like you@example.com";
  if (v.tooShort && el instanceof HTMLInputElement) return `Use at least ${el.minLength} characters`;
  return el.validationMessage;
}

/**
 * Field-level errors for a form: client checks on submit (required, email, minLength),
 * then field errors returned by the API. Each error clears as soon as its field is edited.
 */
function useFormErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  /** Wraps a submit handler: runs only when the browser checks pass. */
  const onSubmit = (submit: () => void) => (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found: Record<string, string> = {};
    for (const el of Array.from(e.currentTarget.elements) as Field[]) {
      if (!el.name || !el.willValidate) continue;
      // `tooShort` is only reported for user-typed values; check minLength ourselves too.
      const short = el instanceof HTMLInputElement && el.minLength > 0 && el.value.length > 0 && el.value.length < el.minLength;
      if (short) found[el.name] ??= `Use at least ${(el as HTMLInputElement).minLength} characters`;
      else if (!el.checkValidity()) found[el.name] ??= messageFor(el);
    }
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) {
      (e.currentTarget.querySelector(`[name="${Object.keys(found)[0]}"]`) as Field | null)?.focus();
      return;
    }
    submit();
  };

  /** Shows an API (or auth) error on its fields when it has some, on the form otherwise. */
  const fromError = (error: unknown) => {
    if (error instanceof ApiError && error.fields && Object.keys(error.fields).length) setErrors(error.fields);
    else setFormError(error instanceof Error ? error.message : String(error));
  };

  const clear = (name: string) => {
    setFormError(null);
    if (errors[name]) setErrors(({ [name]: _, ...rest }) => rest);
  };

  return { errors, formError, onSubmit, fromError, clear, formProps: { noValidate: true } };
}

/**
 * A form's text fields with their errors: `field("email")` gives an Input its name, value, onChange and
 * error, and editing a field clears its error.
 */
export function useForm<T extends Record<string, string>>(initial: T) {
  const form = useFormErrors();
  const [values, setValues] = useState(initial);
  const field = (name: keyof T & string) => ({
    name,
    value: values[name],
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      setValues((current) => ({ ...current, [name]: e.target.value }));
      form.clear(name);
    },
    error: form.errors[name],
  });
  return { ...form, values, field, reset: () => setValues(initial) };
}
