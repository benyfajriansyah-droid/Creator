import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  PLAN_AI_QUOTA,
  PLAN_LABEL,
  PLAN_PRICE,
  getManualPaymentNumber,
  getQuotaStatus,
  isBillingConfigured,
  isManualPaymentConfigured,
  isMonetizationLive,
} from "@/lib/billing";
import { Badge, Card, PageHeader } from "@/components/ui";
import { formatDateTime, formatNumber, formatRupiah } from "@/lib/constants";
import UpgradeButton from "@/components/billing/UpgradeButton";
import ManualPaymentButton from "@/components/billing/ManualPaymentButton";
import type { Tone } from "@/components/ui";

export const dynamic = "force-dynamic";

const ORDER_STATUS_LABEL: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: "Menunggu bayar", tone: "warning" },
  PAID: { label: "Lunas", tone: "success" },
  FAILED: { label: "Gagal", tone: "danger" },
  EXPIRED: { label: "Kedaluwarsa", tone: "neutral" },
};

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

  const billingLive = isBillingConfigured();
  const manualLive = isManualPaymentConfigured();
  const isFree = user.plan === "FREE";
  const pendingManualPlan = orders.find(
    (o) => o.provider === "manual" && o.status === "PENDING"
  )?.plan;
  const manualNumber = getManualPaymentNumber();

  return (
    <div>
      <PageHeader
        title="Billing & Plan"
        description="Lihat plan aktif kamu dan pemakaian kuota AI bulan ini."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
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
              Diperbarui otomatis {formatDateTime(user.planRenewsAt)}
            </p>
          )}

          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <p className="text-sm font-medium text-[var(--text-muted)]">Kuota AI bulan ini</p>
            {!isMonetizationLive() ? (
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

        {isFree && (billingLive || manualLive) && (
          <>
            <PlanCard
              plan="PRO"
              featured
              billingLive={billingLive}
              manualLive={manualLive}
              manualNumber={manualNumber}
              pending={pendingManualPlan === "PRO"}
            />
            <PlanCard
              plan="STUDIO"
              billingLive={billingLive}
              manualLive={manualLive}
              manualNumber={manualNumber}
              pending={pendingManualPlan === "STUDIO"}
            />
          </>
        )}

        {!billingLive && !manualLive && (
          <Card className="p-5 lg:col-span-2">
            <p className="text-sm font-medium">Pembayaran belum aktif</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Aplikasi masih tahap uji coba — belum ada cara bayar yang tersambung, jadi
              semua fitur AI sementara tanpa batas untuk semua akun.
            </p>
          </Card>
        )}
      </div>

      {orders.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-[var(--text)]">Riwayat transaksi</h2>
          <Card className="divide-y divide-[var(--border)]">
            {orders.map((order) => {
              const status = ORDER_STATUS_LABEL[order.status];
              return (
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
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums">{formatRupiah(order.amount)}</span>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  featured = false,
  billingLive,
  manualLive,
  manualNumber,
  pending,
}: {
  plan: "PRO" | "STUDIO";
  featured?: boolean;
  billingLive: boolean;
  manualLive: boolean;
  manualNumber: string | null;
  pending: boolean;
}) {
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{PLAN_LABEL[plan]}</h3>
        {featured && <Badge tone="accent">Rekomendasi</Badge>}
      </div>
      <p className="mt-1 text-2xl font-semibold tracking-tight">
        {formatRupiah(PLAN_PRICE[plan])}
        <span className="text-sm font-normal text-[var(--text-muted)]">/bulan</span>
      </p>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        {PLAN_AI_QUOTA[plan]} aksi AI/bulan — ide konten, hook, script, caption.
      </p>

      <div className="mt-auto space-y-3 pt-4">
        {billingLive && <UpgradeButton plan={plan} label={`Upgrade ke ${PLAN_LABEL[plan]}`} />}

        {manualLive &&
          (pending ? (
            <p className="rounded-lg border border-[var(--warning-border)] bg-[var(--warning-bg)] px-3 py-2 text-xs text-[var(--warning)]">
              Menunggu konfirmasi transfer kamu. Kirim bukti transfer ke nomor di bawah kalau
              belum.
            </p>
          ) : (
            <div className="rounded-lg border border-[var(--border)] p-3">
              <p className="text-xs text-[var(--text-muted)]">
                Atau transfer GoPay ke{" "}
                <span className="font-medium text-[var(--text)]">{manualNumber}</span>, sertakan
                nama/email kamu di catatan, lalu klik konfirmasi di bawah.
              </p>
              <ManualPaymentButton plan={plan} label="Saya sudah transfer" />
            </div>
          ))}
      </div>
    </Card>
  );
}
