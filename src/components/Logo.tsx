/** The five-stage pipeline mark: one dot per board column, the last one lit for "Tayang". */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" aria-hidden>
      <circle cx="68" cy="18.8" r="5.5" fill="currentColor" opacity="0.55" />
      <circle cx="29.3" cy="20.5" r="6" fill="currentColor" opacity="0.65" />
      <circle cx="14.5" cy="56.3" r="6.5" fill="currentColor" opacity="0.75" />
      <circle cx="40.7" cy="84.8" r="7" fill="currentColor" opacity="0.85" />
      <circle cx="77.6" cy="73.1" r="8.5" fill="var(--logo-live, #E85D3E)" />
      <path d="M54 36 L54 60 L74 48 Z" fill="currentColor" />
    </svg>
  );
}

export function Logo({ iconClassName, textClassName }: { iconClassName?: string; textClassName?: string }) {
  return (
    <>
      <span
        className={
          iconClassName ??
          "flex size-8 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-text)]"
        }
      >
        <LogoMark className="size-[68%]" />
      </span>
      <span className={textClassName ?? "text-base font-semibold tracking-tight"}>Creator Studio</span>
    </>
  );
}
