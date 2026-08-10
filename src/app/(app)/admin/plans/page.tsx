import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { isAdmin, PLAN_LABEL } from "@/lib/billing";
import { Badge, Card, PageHeader, SectionHeading } from "@/components/ui";
import { formatDateTime } from "@/lib/constants";
import ActivatePlanForm from "@/components/billing/ActivatePlanForm";
import ResetLinkForm from "@/components/billing/ResetLinkForm";
import { isMailConfigured } from "@/lib/mail";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  const user = await requireUser();
  if (!isAdmin(user.email)) notFound();

  const [paidUsers, history] = await Promise.all([
    prisma.user.findMany({
      where: { plan: { not: "FREE" } },
      orderBy: { planRenewsAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        planRenewsAt: true,
      },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  const now = new Date();

  return (
    <div>
      <PageHeader
        title="Aktifkan Plan"
        description="Pembayaran ditangani lynk.id, jadi akun klien diaktifkan di sini setelah pembayarannya masuk."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section>
            <SectionHeading title="Aktifkan akun" />
            <Card className="p-5">
              <ActivatePlanForm />
            </Card>
          </section>

          <section>
            <SectionHeading
              title="Reset password"
              description="Buat tautan ganti password untuk pengguna yang lupa."
            />
            <Card className="p-5">
              <ResetLinkForm mailEnabled={isMailConfigured()} />
            </Card>
          </section>
        </div>

        <div className="space-y-6">
          <section>
            <SectionHeading
              title={`Langganan aktif (${paidUsers.length})`}
              description="Masa aktif 30 hari sejak diaktifkan. Perpanjang dengan mengaktifkan ulang."
            />
            <Card>
              {paidUsers.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                  Belum ada akun berbayar.
                </p>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {paidUsers.map((u) => {
                    const expired = u.planRenewsAt
                      ? u.planRenewsAt < now
                      : false;
                    return (
                      <div
                        key={u.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{u.name}</p>
                          <p className="truncate text-xs text-[var(--text-subtle)]">
                            {u.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[var(--text-muted)]">
                            {u.planRenewsAt ? `s/d ${formatDateTime(u.planRenewsAt)}` : "—"}
                          </span>
                          <Badge tone={expired ? "danger" : "success"}>
                            {expired ? "Kedaluwarsa" : PLAN_LABEL[u.plan]}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </section>

          {history.length > 0 && (
            <section>
              <SectionHeading title="Riwayat aktivasi" />
              <Card className="divide-y divide-[var(--border)]">
                {history.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {order.user.name}{" "}
                      <span className="text-xs text-[var(--text-subtle)]">
                        ({order.user.email})
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-[var(--text-muted)]">
                      {PLAN_LABEL[order.plan]} · {formatDateTime(order.createdAt)}
                    </span>
                  </div>
                ))}
              </Card>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
