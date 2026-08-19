import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Link href="/login" className="mb-8 flex items-center gap-2.5">
        <Logo
          iconClassName="flex size-9 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-text)]"
          textClassName="text-lg font-semibold tracking-tight"
        />
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
