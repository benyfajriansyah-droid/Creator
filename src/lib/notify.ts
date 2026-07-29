import "server-only";
import webpush from "web-push";
import type { NotificationKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getVapidKeys } from "@/lib/secrets";

export type NotifyInput = {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string;
  /** Skip the phone push and only record it in the in-app inbox. */
  inAppOnly?: boolean;
};

/**
 * Records a notification in the in-app inbox and, unless told otherwise, pushes
 * it to every device the user has subscribed. Push failures never bubble up —
 * a dead subscription should not fail the action that triggered it.
 */
export async function notify({
  userId,
  kind,
  title,
  body,
  href,
  inAppOnly = false,
}: NotifyInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: { userId, kind, title, body, href },
    });
  } catch (error) {
    console.error("Failed to record notification", error);
  }

  if (inAppOnly) return;
  await sendPush({ userId, title, body, href });
}

export async function sendPush({
  userId,
  title,
  body,
  href,
}: {
  userId: string;
  title: string;
  body: string;
  href?: string;
}): Promise<void> {
  let subscriptions;
  try {
    subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  } catch (error) {
    console.error("Failed to load push subscriptions", error);
    return;
  }
  if (subscriptions.length === 0) return;

  const keys = await getVapidKeys();
  webpush.setVapidDetails("mailto:noreply@creator-studio.app", keys.publicKey, keys.privateKey);

  const payload = JSON.stringify({ title, body, href: href ?? "/" });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // 404/410 mean the browser dropped the subscription — clean it up.
        if (status === 404 || status === 410) {
          await prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => undefined);
        } else {
          console.error("Push delivery failed", error);
        }
      }
    })
  );
}
