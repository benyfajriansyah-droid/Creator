import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
          </Link>
          <Link href="/" className="text-sm text-[var(--accent)] hover:underline">
            Kembali
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-[var(--text-subtle)]">Terakhir diperbarui: {updated}</p>
        <article className="mt-8 space-y-7 text-sm leading-7 text-[var(--text-muted)] [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-[var(--text)] [&_a]:text-[var(--accent)] [&_a]:underline [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </article>
      </main>
    </div>
  );
}
