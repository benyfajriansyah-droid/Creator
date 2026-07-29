import Link from "next/link";
import type { SocialAccount } from "@prisma/client";

/** Pill row for narrowing a view down to a single social account. */
export default function AccountFilter({
  accounts,
  basePath,
  selected,
  extraParams,
}: {
  accounts: SocialAccount[];
  basePath: string;
  selected?: string;
  extraParams?: Record<string, string | undefined>;
}) {
  if (accounts.length < 2) return null;

  const href = (accountId?: string) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(extraParams ?? {})) {
      if (value) params.set(key, value);
    }
    if (accountId) params.set("account", accountId);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      <Link
        href={href()}
        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
          !selected
            ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
            : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
        }`}
      >
        Semua akun
      </Link>
      {accounts.map((account) => {
        const active = selected === account.id;
        return (
          <Link
            key={account.id}
            href={href(account.id)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              active
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
            }`}
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: account.color }}
              aria-hidden
            />
            {account.label}
          </Link>
        );
      })}
    </div>
  );
}
