import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

const toneStyles: Record<Tone, string> = {
  neutral: "bg-[var(--neutral-bg)] text-[var(--neutral)] border-[var(--neutral-border)]",
  success: "bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-border)]",
  warning: "bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning-border)]",
  danger: "bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger-border)]",
  info: "bg-[var(--info-bg)] text-[var(--info)] border-[var(--info-border)]",
  accent: "bg-[var(--accent-soft)] text-[var(--accent)] border-[color-mix(in_srgb,var(--accent)_25%,transparent)]",
};

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${toneStyles[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className = "",
  ...rest
}: { children: ReactNode; className?: string } & ComponentProps<"div">) {
  return (
    <div
      className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)] ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  title,
  action,
  description,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60";

export const buttonStyles = {
  primary: `${buttonBase} bg-[var(--accent)] px-4 py-2 text-[var(--accent-text)] hover:bg-[var(--accent-hover)]`,
  secondary: `${buttonBase} border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2 text-[var(--text)] hover:bg-[var(--surface-muted)]`,
  ghost: `${buttonBase} px-3 py-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]`,
  danger: `${buttonBase} border border-[var(--danger-border)] bg-[var(--surface)] px-3 py-1.5 text-[var(--danger)] hover:bg-[var(--danger-bg)]`,
};

export function ButtonLink({
  href,
  variant = "primary",
  children,
  className = "",
}: {
  href: string;
  variant?: keyof typeof buttonStyles;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`${buttonStyles[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export const inputStyles =
  "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[var(--text)]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-[var(--text-muted)]">{hint}</span>}
    </label>
  );
}

export function EmptyState({
  title,
  description,
  action,
  compact = false,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-dashed border-[var(--border-strong)] text-center ${
        compact ? "px-4 py-6" : "px-6 py-12"
      }`}
    >
      <p className={`font-medium text-[var(--text)] ${compact ? "text-sm" : "text-base"}`}>
        {title}
      </p>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--text-muted)]">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-[var(--text)]">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-[var(--text-subtle)]">{sub}</p>}
    </Card>
  );
}
