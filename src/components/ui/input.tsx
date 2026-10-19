"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<"input">;

const inputClasses =
  "bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-9 rounded-4xl border px-3 py-1 text-base transition-colors file:h-7 file:text-sm file:font-medium focus-visible:ring-[3px] aria-invalid:ring-[3px] md:text-sm file:text-foreground placeholder:text-muted-foreground w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";

export function normalizeDecimalText(raw: string): string {
  return raw.replace(",", ".");
}

export function acceptsDecimalDraft(raw: string): boolean {
  // Allow incomplete values during typing: "", "-", "20,", "20.", ",5".
  return /^-?(?:\d*(?:[.,]\d*)?)$/.test(raw);
}

function NumericInput({
  className,
  value,
  defaultValue,
  step,
  inputMode,
  onChange,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  // Keep the literal text while the field is focused. Parent components store
  // numbers and often parseFloat/Number every keystroke: otherwise "20,50",
  // "20." and partially typed decimals get truncated on every render.
  const [draft, setDraft] = React.useState<string | null>(null);
  const committed = String(value ?? defaultValue ?? "");
  const shown = draft ?? committed;
  const integerOnly = step !== undefined && Number(step) === 1;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.currentTarget.value;
    if (!acceptsDecimalDraft(raw)) return;
    setDraft(raw);

    // Existing forms receive the same ChangeEvent API as before but with a
    // normalized numeric value, including when the user enters a comma.
    // Do not mutate the actual DOM input: that would jump the caret.
    const normalized = normalizeDecimalText(raw);
    const forwarded = {
      ...event,
      target: { ...event.target, value: normalized } as HTMLInputElement,
      currentTarget: { ...event.currentTarget, value: normalized } as HTMLInputElement,
    } as React.ChangeEvent<HTMLInputElement>;
    onChange?.(forwarded);
  };

  return (
    <input
      {...props}
      type="text"
      data-slot="input"
      data-numeric-input="true"
      inputMode={inputMode ?? (integerOnly ? "numeric" : "decimal")}
      value={shown}
      onFocus={(event) => {
        setDraft(String(value ?? defaultValue ?? ""));
        onFocus?.(event);
      }}
      onChange={handleChange}
      onBlur={(event) => {
        setDraft(null);
        onBlur?.(event);
      }}
      className={cn(inputClasses, className)}
    />
  );
}

function Input({ className, type, ...props }: InputProps) {
  if (type === "number") {
    return <NumericInput className={className} {...props} />;
  }
  return (
    <input
      {...props}
      type={type}
      data-slot="input"
      className={cn(inputClasses, className)}
    />
  );
}

export { Input };
