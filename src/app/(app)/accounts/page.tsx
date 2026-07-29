import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createAccount, deleteAccount, updateAccount } from "@/app/actions";
import { PageHeader, Card, EmptyState, SectionHeading } from "@/components/ui";
import AccountForm from "@/components/AccountForm";
import DeleteButton from "@/components/DeleteButton";
import { PLATFORM_LABEL, formatNumber } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const user = await requireUser();

  const accounts = await prisma.socialAccount.findMany({
    where: { userId: user.id },
    include: { _count: { select: { contentItems: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Akun Sosmed"
        description="Kelola beberapa akun sekaligus — tiap konten bisa dilabeli akun mana."
      />

      <section className="mb-8">
        <SectionHeading title="Tambah akun" />
        <Card className="p-5">
          <AccountForm action={createAccount} submitLabel="Tambah Akun" />
        </Card>
      </section>

      <SectionHeading title={`Akun kamu (${accounts.length})`} />

      {accounts.length === 0 ? (
        <EmptyState
          title="Belum ada akun"
          description="Tambahkan akun sosmed supaya konten bisa dikelompokkan dan performanya dibandingkan per akun."
        />
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <Card key={account.id} className="p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="size-9 shrink-0 rounded-lg"
                    style={{ backgroundColor: account.color }}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{account.label}</p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {PLATFORM_LABEL[account.platform]}
                      {account.handle ? ` · ${account.handle}` : ""} ·{" "}
                      {formatNumber(account._count.contentItems)} konten
                    </p>
                  </div>
                </div>
                <DeleteButton
                  action={deleteAccount.bind(null, account.id)}
                  confirmMessage={`Hapus akun "${account.label}"? Konten yang terhubung tidak ikut terhapus, hanya kehilangan label akunnya.`}
                />
              </div>

              <details className="group">
                <summary className="cursor-pointer text-sm text-[var(--accent)] hover:underline">
                  Edit akun
                </summary>
                <div className="mt-4 border-t border-[var(--border)] pt-4">
                  <AccountForm
                    account={account}
                    action={updateAccount.bind(null, account.id)}
                    submitLabel="Simpan Perubahan"
                  />
                </div>
              </details>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
