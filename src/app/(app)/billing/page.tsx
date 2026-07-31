import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  LYNK_CHECKOUT_URL,
  PLAN_AI_QUOTA,
  PLAN_LABEL,
  PLAN_PRICE,
  getQuotaStatus,
  isMonetizationLive,
} from "@/lib/billing";
import { Badge, Card, PageHeader, buttonStyles } from "@/components/ui";
import { formatDateTime, formatNumber, formatRupiah } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const user = await requireUser();
  const [quota, orders] = await Promise.all([
    getQuotaStatus(user.id),
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const isFree = user.plan === "FREE";
  const enforced = isMonetizationLive();

  return (
    <div>
      <PageHeader
        title="Billing & Plan"
        description="Plan aktif kamu dan pemakaian kuota AI bulan ini."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-[var(--text-muted)]">Plan aktif</p>
            <Badge tone={isFree ? "neutral" : "accent"}>{PLAN_LABEL[user.plan]}</Badge>
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {formatRupiah(PLAN_PRICE[user.plan])}
            <span className="text-sm font-normal text-[var(--text-muted)]">/bulan</span>
          </p>
          {user.planRenewsAt && (
            <p className="mt-1 text-xs text-[var(--text-subtle)]">
              Aktif sampai {formatDateTime(user.planRenewsAt)}
            </p>
          )}

          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <p className="text-sm font-medium text-[var(--text-muted)]">Kuota AI bulan ini</p>
            {!enforced ? (
              <p className="mt-1 text-sm text-[var(--success)]">
                Tanpa batas untuk sekarang (mode uji coba).
              </p>
            ) : PLAN_AI_QUOTA[user.plan] === 0 ? (
              <p className="mt-1 text-sm text-[var(--text-subtle)]">
                Plan Gratis belum termasuk asisten AI.
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm">
                  {formatNumber(quota.used)} / {formatNumber(quota.limit)} aksi terpakai
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)]"
                    style={{
                      width: `${Math.min(100, (quota.used / Math.max(1, quota.limit)) * 100)}%`,
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </Card>

        {isFree ? (
          <Card className="flex flex-col p-5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{PLAN_LABEL.PRO}</h3>
              <Badge tone="accent">Buka asisten AI</Badge>
            </div>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {formatRupiah(PLAN_PRICE.PRO)}
              <span className="text-sm font-normal text-[var(--text-muted)]">/bulan</span>
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {PLAN_AI_QUOTA.PRO} aksi AI per bulan — ide konten, hook, script, caption,
              funnel, dan memecah satu konten jadi beberapa versi.
            </p>
            <div className="mt-auto pt-4">
              <a
                href={LYNK_CHECKOUT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${buttonStyles.primary} w-full`}
              >
                Langganan lewat lynk.id
              </a>
              <p className="mt-2 text-xs text-[var(--text-subtle)]">
                Pembayaran diproses lynk.id. Setelah bayar, kirim bukti dan email akun ini
                supaya plannya kami aktifkan.
              </p>
            </div>
          </Card>
        ) : (
          <Card className="flex flex-col p-5">
            <h3 className="text-sm font-semibold">Perpanjang</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Langganan berjalan 30 hari dan tidak diperpanjang otomatis. Bayar lagi lewat
              tautan yang sama sebelum masa aktifnya habis, lalu kabari kami.
            </p>
            <div className="mt-auto pt-4">
              <a
                href={LYNK_CHECKOUT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${buttonStyles.secondary} w-full`}
              >
                Perpanjang lewat lynk.id
              </a>
            </div>
          </Card>
        )}
      </div>

      {orders.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-[var(--text)]">Riwayat aktivasi</h2>
          <Card className="divide-y divide-[var(--border)]">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{PLAN_LABEL[order.plan]}</p>
                  <p className="text-xs text-[var(--text-subtle)]">
                    {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <span className="tabular-nums">{formatRupiah(order.amount)}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
