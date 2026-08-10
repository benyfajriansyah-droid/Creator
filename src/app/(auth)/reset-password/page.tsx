import Link from "next/link";
import ResetPasswordForm from "@/components/ResetPasswordForm";
import { isResetTokenUsable } from "@/lib/password-reset";
import { Card, buttonStyles } from "@/components/ui";

export const metadata = { title: "Atur Ulang Password · Creator Studio" };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  // Checked before showing the form, so a dead link says so straight away
  // instead of after someone has typed a new password twice.
  if (!token || !(await isResetTokenUsable(token))) {
    return (
      <Card className="p-6">
        <h1 className="text-xl font-semibold tracking-tight">Tautannya tidak berlaku</h1>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Tautan reset password hanya berlaku 1 jam dan sekali pakai. Minta yang baru
          untuk melanjutkan.
        </p>
        <Link
          href="/forgot-password"
          className={`${buttonStyles.primary} mt-5 w-full justify-center`}
        >
          Minta tautan baru
        </Link>
      </Card>
    );
  }

  return <ResetPasswordForm token={token} />;
}
