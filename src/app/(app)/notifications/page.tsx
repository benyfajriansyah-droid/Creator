import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { markNotificationsRead } from "@/app/actions";
import { PageHeader, Card, EmptyState, buttonStyles } from "@/components/ui";
import { relativeTime } from "@/lib/constants";

export const dynamic = "force-dynamic";

const KIND_ICON: Record<string, string> = {
  CONTENT_SAVED: "💾",
  CONTENT_SCHEDULED: "🗓",
  SCHEDULE_REMINDER: "⏰",
  DAILY_DIGEST: "☀️",
  METRICS_REMINDER: "📊",
};

export default async function NotificationsPage() {
  const user = await requireUser();

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Notifikasi"
        description={unread > 0 ? `${unread} belum dibaca` : "Semua sudah dibaca"}
        action={
          unread > 0 ? (
            <form action={markNotificationsRead}>
              <button type="submit" className={buttonStyles.secondary}>
                Tandai semua dibaca
              </button>
            </form>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          title="Belum ada notifikasi"
          description="Pengingat jadwal konten dan ringkasan harian akan muncul di sini — dan di HP kamu kalau notifikasi sudah diaktifkan."
          action={
            <Link href="/settings" className={buttonStyles.primary}>
              Aktifkan notifikasi
            </Link>
          }
        />
      ) : (
        <Card className="divide-y divide-[var(--border)] overflow-hidden">
          {notifications.map((notification) => {
            const body = (
              <div
                className={`flex gap-3 px-4 py-3 ${
                  notification.read ? "" : "bg-[var(--accent-soft)]/50"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {KIND_ICON[notification.kind] ?? "🔔"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{notification.title}</p>
                  <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                    {notification.body}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-subtle)]">
                    {relativeTime(notification.createdAt)}
                  </p>
                </div>
                {!notification.read && (
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full bg-[var(--accent)]"
                    aria-label="Belum dibaca"
                  />
                )}
              </div>
            );

            return notification.href ? (
              <Link
                key={notification.id}
                href={notification.href}
                className="block transition-colors hover:bg-[var(--surface-muted)]"
              >
                {body}
              </Link>
            ) : (
              <div key={notification.id}>{body}</div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
