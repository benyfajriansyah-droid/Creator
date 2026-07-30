import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { isAdmin, PLAN_LABEL } from "@/lib/billing";
import { Badge, Card, PageHeader } from "@/components/ui";
import { formatDateTime, formatRupiah } from "@/lib/constants";
import ConfirmOrderButton from "@/components/billing/ConfirmOrderButton";
import type { Tone } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, Tone> = {
  PENDING: "warning",
  PAID: "success",
  FAILED: "danger",
  EXPIRED: "neutral",
};

export default async function AdminOrdersPage() {
  const user = await requireUser();
  if (!isAdmin(user.email)) notFound();

  const orders = await prisma.order.findMany({
    where: { provider: "manual" },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const pending = orders.filter((o) => o.status === "PENDING");
  const rest = orders.filter((o) => o.status !== "PENDING");

  return (
    <div>
      <PageHeader
        title="Konfirmasi Pembayaran Manual"
        description="Cocokkan transfer masuk dengan order di bawah, lalu tandai lunas."
      />

      <h2 className="mb-3 text-sm font-semibold">Menunggu konfirmasi ({pending.length})</h2>
      {pending.length === 0 ? (
        <Card className="p-5 text-sm text-[var(--text-muted)]">Tidak ada yang menunggu.</Card>
      ) : (
        <Card className="mb-8 divide-y divide-[var(--border)]">
          {pending.map((order) => (
            <div
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium">
                  {order.user.name}{" "}
                  <span className="font-normal text-[var(--text-muted)]">
                    ({order.user.email})
                  </span>
                </p>
                <p className="text-xs text-[var(--text-subtle)]">
                  {PLAN_LABEL[order.plan]} · {formatRupiah(order.amount)} ·{" "}
                  {formatDateTime(order.createdAt)}
                </p>
              </div>
              <ConfirmOrderButton orderId={order.id} />
            </div>
          ))}
        </Card>
      )}

      {rest.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-semibold">Riwayat</h2>
          <Card className="divide-y divide-[var(--border)]">
            {rest.map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {order.user.name}{" "}
                    <span className="font-normal text-[var(--text-muted)]">
                      ({order.user.email})
                    </span>
                  </p>
                  <p className="text-xs text-[var(--text-subtle)]">
                    {PLAN_LABEL[order.plan]} · {formatRupiah(order.amount)} ·{" "}
                    {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
