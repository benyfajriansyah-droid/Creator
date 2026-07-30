import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Link href="/login" className="mb-8 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-text)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
        <span className="text-lg font-semibold tracking-tight">Creator Studio</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
