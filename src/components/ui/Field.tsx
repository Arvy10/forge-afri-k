import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

const control =
  "block w-full rounded-lg border border-line-strong bg-surface px-3 text-base text-ink placeholder:text-ink-muted/70 disabled:opacity-60 aria-[invalid=true]:border-danger md:text-sm";

type FieldShellProps = {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  required?: boolean;
  children: (ids: {
    id: string;
    describedBy: string | undefined;
    invalid: boolean;
  }) => React.ReactNode;
};

export function FieldShell({ label, error, hint, className, required, children }: FieldShellProps) {
  const id = useId();
  const describedBy =
    [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="text-ink block text-sm font-medium">
        {label}
        {required && (
          <span aria-hidden className="text-accent-strong ml-0.5">
            *
          </span>
        )}
      </label>
      {children({ id, describedBy, invalid: !!error })}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-ink-muted text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="text-danger text-xs font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

type Common = { label: string; error?: string; hint?: string; wrapperClassName?: string };

export const TextField = forwardRef<
  HTMLInputElement,
  Common & React.InputHTMLAttributes<HTMLInputElement>
>(function TextField({ label, error, hint, wrapperClassName, className, required, ...rest }, ref) {
  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      className={wrapperClassName}
      required={required}
    >
      {({ id, describedBy, invalid }) => (
        <input
          ref={ref}
          id={id}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          required={required}
          {...rest}
          className={cn(control, "min-h-11", className)}
        />
      )}
    </FieldShell>
  );
});

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  Common & React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextArea({ label, error, hint, wrapperClassName, className, required, ...rest }, ref) {
  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      className={wrapperClassName}
      required={required}
    >
      {({ id, describedBy, invalid }) => (
        <textarea
          ref={ref}
          id={id}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          rows={3}
          {...rest}
          className={cn(control, "py-2.5", className)}
        />
      )}
    </FieldShell>
  );
});

export const SelectField = forwardRef<
  HTMLSelectElement,
  Common & React.SelectHTMLAttributes<HTMLSelectElement>
>(function SelectField(
  { label, error, hint, wrapperClassName, className, children, required, ...rest },
  ref,
) {
  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      className={wrapperClassName}
      required={required}
    >
      {({ id, describedBy, invalid }) => (
        <select
          ref={ref}
          id={id}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          {...rest}
          className={cn(control, "min-h-11", className)}
        >
          {children}
        </select>
      )}
    </FieldShell>
  );
});

/** Message d'erreur global d'un formulaire. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="bg-danger-soft text-danger rounded-lg px-3 py-2.5 text-sm font-medium"
    >
      {message}
    </p>
  );
}
