import { ChevronDown, CircleAlert, Search } from "lucide-react";
import { Switch, ToggleGroup } from "radix-ui";
import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  useId,
} from "react";
import { cx } from "./cx";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition active:scale-[0.97] disabled:opacity-50",
        variant === "primary" && "bg-accent text-accent-ink hover:bg-accent-strong",
        variant === "ghost" && "bg-raised text-text hover:bg-line",
        variant === "danger" && "bg-rose/15 text-rose hover:bg-rose/25",
        className,
      )}
      {...props}
    />
  );
}

const CHIP =
  "shrink-0 rounded-full bg-raised font-bold text-muted transition hover:text-text data-[state=on]:bg-accent data-[state=on]:text-accent-ink";
const chipSize = (small: boolean) => (small ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm");
const chipRow = (wrap: boolean) => (wrap ? "flex flex-wrap gap-2" : "no-scrollbar flex gap-1.5 overflow-x-auto");

interface ChipsProps<T extends string> {
  label: string;
  options: readonly { value: T; label: ReactNode }[];
  small?: boolean;
  /** Wrap onto more lines instead of scrolling sideways. */
  wrap?: boolean;
  className?: string;
}

/**
 * One choice among a few, as pills (Radix ToggleGroup: arrow keys move between them). Clicking the
 * active pill keeps it on rather than leaving nothing chosen.
 */
export function Chips<T extends string>({
  label,
  value,
  onChange,
  options,
  small = false,
  wrap = false,
  className,
}: ChipsProps<T> & { value: T; onChange: (value: T) => void }) {
  return (
    <ToggleGroup.Root
      type="single"
      aria-label={label}
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      className={cx(chipRow(wrap), className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item key={o.value} value={o.value} className={cx(CHIP, chipSize(small))}>
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}

/** Several choices among a few, as pills; at least one stays on. */
export function MultiChips<T extends string>({
  label,
  value,
  onChange,
  options,
  small = false,
  wrap = false,
  className,
}: ChipsProps<T> & { value: T[]; onChange: (value: T[]) => void }) {
  return (
    <ToggleGroup.Root
      type="multiple"
      aria-label={label}
      value={value}
      // Kept in the options' order, never empty.
      onValueChange={(picked) => picked.length > 0 && onChange(options.map((o) => o.value).filter((v) => picked.includes(v)))}
      className={cx(chipRow(wrap), className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item key={o.value} value={o.value} className={cx(CHIP, chipSize(small))}>
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}

export function Input({
  label,
  error,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-muted">
        {label}
      </label>
      <input
        id={id}
        data-label={label}
        aria-invalid={!!error}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        className={cx(
          "w-full rounded-2xl border bg-surface px-4 py-3 text-text placeholder:text-muted/60 focus:outline-none",
          error ? "border-rose focus:border-rose" : "border-line focus:border-accent",
        )}
        {...props}
      />
      {(error || hint) && (
        <p id={`${id}-msg`} className={cx("mt-1.5 flex items-center gap-1.5 text-sm", error ? "text-rose" : "text-muted")}>
          {error && <CircleAlert className="size-4 shrink-0" />}
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

/**
 * A field to type a search or a filter in, without a visible label. 16px on phones: iOS zooms into any
 * field with smaller text when it gets focus, and stays zoomed.
 */
export function SearchInput({
  icon = false,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { "aria-label": string; icon?: boolean }) {
  return (
    <div className={cx("relative", className)}>
      {icon && <Search className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />}
      <input
        className={cx(
          "w-full rounded-2xl border border-line bg-surface pr-4 text-base placeholder:text-muted/60 focus:border-accent focus:outline-none md:text-sm",
          icon ? "py-3.5 pl-12" : "py-2.5 pl-4",
        )}
        {...props}
      />
    </div>
  );
}

/** Native <select> (keyboard and mobile pickers for free) styled like Input. */
export function Select({
  label,
  hint,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-muted">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="w-full cursor-pointer appearance-none rounded-2xl border border-line bg-surface py-3 pr-11 pl-4 text-text transition hover:border-muted/40 focus:border-accent focus:outline-none disabled:cursor-wait disabled:opacity-60"
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-muted" />
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

/** One setting: its name and what it does, with its control on the right or below (`stacked`). */
export function SettingRow({
  label,
  description,
  htmlFor,
  stacked = false,
  children,
}: {
  label: string;
  description?: ReactNode;
  /** The control's id, so a tap on the label reaches it. */
  htmlFor?: string;
  stacked?: boolean;
  children: ReactNode;
}) {
  const text = (
    <>
      <span className="block font-semibold">{label}</span>
      {description && <span className="block text-sm text-muted">{description}</span>}
    </>
  );
  return (
    <div className={cx("py-2", !stacked && "flex items-center justify-between gap-4")}>
      {htmlFor ? (
        <label htmlFor={htmlFor} className="cursor-pointer">
          {text}
        </label>
      ) : (
        <div className={cx(stacked && "mb-2")}>{text}</div>
      )}
      {children}
    </div>
  );
}

/** An on/off setting, as a switch. */
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
    <SettingRow label={label} description={description} htmlFor={id}>
      <Switch.Root
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="relative h-7 w-12 shrink-0 cursor-pointer rounded-full bg-line transition data-[state=checked]:bg-accent"
      >
        <Switch.Thumb className="block size-5 translate-x-1 rounded-full bg-text shadow transition-transform data-[state=checked]:translate-x-6" />
      </Switch.Root>
    </SettingRow>
  );
}
