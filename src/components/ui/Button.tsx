import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold whitespace-nowrap transition-[background-color,filter,transform,box-shadow] duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent-strong text-on-accent shadow-[0_2px_0_rgb(0_0_0/0.12),0_8px_16px_-8px_rgb(166_62_4/0.6)] hover:brightness-110 active:brightness-95",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-surface-2",
  ghost: "text-ink hover:bg-surface-2",
  danger: "bg-danger text-canvas hover:brightness-110",
};

export function buttonClass(variant: Variant = "primary", className?: string) {
  return cn(base, variants[variant], className);
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
};

export function Button({
  variant = "primary",
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, className)}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  variant = "primary",
  className,
  ...rest
}: React.ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link {...rest} className={buttonClass(variant, className)} />;
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cn(
        "text-ink hover:bg-surface-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}
