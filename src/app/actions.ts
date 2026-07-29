"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ContentStatus, Platform } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { DEFAULT_CHECKLIST, formatDateTime } from "@/lib/constants";
import { parseDatetimeLocal } from "@/lib/time";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function optionalStr(formData: FormData, key: string): string | null {
  const value = str(formData, key);
  return value.length > 0 ? value : null;
}

/**
 * `datetime-local` inputs submit a naive wall-clock string with no offset, so
 * it has to be read in the user's zone — not the server's, which is UTC.
 */
function optionalDate(
  formData: FormData,
  key: string,
  timeZone: string
): Date | null {
  const value = str(formData, key);
  if (!value) return null;
  return parseDatetimeLocal(value, timeZone);
}

function optionalNumber(formData: FormData, key: string): number | null {
  const value = str(formData, key);
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseTags(formData: FormData): string[] {
  return str(formData, "tags")
    .split(",")
    .map((t) => t.trim().replace(/^#/, ""))
    .filter(Boolean)
    .slice(0, 12);
}

function revalidateAll(id?: string) {
  revalidatePath("/");
  revalidatePath("/board");
  revalidatePath("/calendar");
  revalidatePath("/content");
  revalidatePath("/insights");
  if (id) revalidatePath(`/content/${id}`);
}

/** Narrows an arbitrary account id to one this user actually owns. */
async function resolveAccountId(
  userId: string,
  accountId: string | null
): Promise<string | null> {
  if (!accountId) return null;
  const account = await prisma.socialAccount.findFirst({
    where: { id: accountId, userId },
    select: { id: true },
  });
  return account?.id ?? null;
}

function contentFieldsFrom(formData: FormData, timeZone: string) {
  const status = (str(formData, "status") || "IDEA") as ContentStatus;
  const scheduledAt = optionalDate(formData, "scheduledAt", timeZone);

  return {
    title: str(formData, "title"),
    hook: optionalStr(formData, "hook"),
    description: optionalStr(formData, "description"),
    platform: (str(formData, "platform") || "INSTAGRAM") as Platform,
    contentType: str(formData, "contentType") || "Lainnya",
    status,
    scheduledAt,
    tags: parseTags(formData),
    notes: optionalStr(formData, "notes"),
    postUrl: optionalStr(formData, "postUrl"),
  };
}

export async function createContent(formData: FormData) {
  const user = await requireUser();
  const fields = contentFieldsFrom(formData, user.timeZone);
  if (!fields.title) throw new Error("Judul konten wajib diisi");

  const accountId = await resolveAccountId(user.id, optionalStr(formData, "accountId"));

  const item = await prisma.contentItem.create({
    data: {
      ...fields,
      userId: user.id,
      accountId,
      publishedAt: fields.status === "PUBLISHED" ? new Date() : null,
      checklist: {
        create: DEFAULT_CHECKLIST.map((label, position) => ({ label, position })),
      },
    },
  });

  const scheduled = fields.status === "SCHEDULED" && fields.scheduledAt;
  await notify({
    userId: user.id,
    kind: scheduled ? "CONTENT_SCHEDULED" : "CONTENT_SAVED",
    title: scheduled ? "Konten dijadwalkan" : "Konten tersimpan",
    body: scheduled
      ? `"${fields.title}" dijadwalkan ${formatDateTime(fields.scheduledAt, user.timeZone)}.`
      : `"${fields.title}" masuk ke daftar konten kamu.`,
    href: `/content/${item.id}`,
  });

  revalidateAll(item.id);
  redirect(`/content/${item.id}?toast=created`);
}

export async function updateContent(id: string, formData: FormData) {
  const user = await requireUser();
  const fields = contentFieldsFrom(formData, user.timeZone);
  if (!fields.title) throw new Error("Judul konten wajib diisi");

  const existing = await prisma.contentItem.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) throw new Error("Konten tidak ditemukan");

  const accountId = await resolveAccountId(user.id, optionalStr(formData, "accountId"));
  const rescheduled =
    fields.scheduledAt?.getTime() !== existing.scheduledAt?.getTime();

  await prisma.contentItem.update({
    where: { id },
    data: {
      ...fields,
      accountId,
      publishedAt:
        fields.status === "PUBLISHED" ? existing.publishedAt ?? new Date() : null,
      // A moved slot deserves a fresh reminder.
      reminderSentAt: rescheduled ? null : existing.reminderSentAt,
    },
  });

  if (rescheduled && fields.status === "SCHEDULED" && fields.scheduledAt) {
    await notify({
      userId: user.id,
      kind: "CONTENT_SCHEDULED",
      title: "Jadwal diperbarui",
      body: `"${fields.title}" sekarang tayang ${formatDateTime(fields.scheduledAt, user.timeZone)}.`,
      href: `/content/${id}`,
    });
  }

  revalidateAll(id);
  redirect(`/content/${id}?toast=updated`);
}

/** Board drag/drop and quick status pills both land here. */
export async function moveContentStatus(id: string, status: ContentStatus) {
  const user = await requireUser();
  const existing = await prisma.contentItem.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) throw new Error("Konten tidak ditemukan");

  await prisma.contentItem.update({
    where: { id },
    data: {
      status,
      publishedAt:
        status === "PUBLISHED" ? existing.publishedAt ?? new Date() : existing.publishedAt,
    },
  });

  revalidateAll(id);
}

export async function logMetrics(id: string, formData: FormData) {
  const user = await requireUser();
  const existing = await prisma.contentItem.findFirst({
    where: { id, userId: user.id },
    select: { id: true, publishedAt: true },
  });
  if (!existing) throw new Error("Konten tidak ditemukan");

  await prisma.contentItem.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      publishedAt:
        optionalDate(formData, "publishedAt", user.timeZone) ??
        existing.publishedAt ??
        new Date(),
      postUrl: optionalStr(formData, "postUrl"),
      views: optionalNumber(formData, "views"),
      likes: optionalNumber(formData, "likes"),
      comments: optionalNumber(formData, "comments"),
      shares: optionalNumber(formData, "shares"),
      saves: optionalNumber(formData, "saves"),
      hoursSpent: optionalNumber(formData, "hoursSpent"),
      revenue: optionalNumber(formData, "revenue"),
    },
  });

  revalidateAll(id);
  redirect(`/content/${id}?toast=metrics`);
}

export async function deleteContent(id: string) {
  const user = await requireUser();
  const { count } = await prisma.contentItem.deleteMany({
    where: { id, userId: user.id },
  });
  if (count === 0) throw new Error("Konten tidak ditemukan");

  revalidateAll();
  redirect("/content?toast=deleted");
}

export async function toggleChecklistItem(itemId: string) {
  const user = await requireUser();
  const item = await prisma.checklistItem.findFirst({
    where: { id: itemId, content: { userId: user.id } },
    select: { id: true, done: true, contentId: true },
  });
  if (!item) throw new Error("Item tidak ditemukan");

  await prisma.checklistItem.update({
    where: { id: itemId },
    data: { done: !item.done },
  });

  revalidatePath(`/content/${item.contentId}`);
  revalidatePath("/board");
}

export async function addChecklistItem(contentId: string, formData: FormData) {
  const user = await requireUser();
  const label = str(formData, "label");
  if (!label) return;

  const content = await prisma.contentItem.findFirst({
    where: { id: contentId, userId: user.id },
    select: { id: true, _count: { select: { checklist: true } } },
  });
  if (!content) throw new Error("Konten tidak ditemukan");

  await prisma.checklistItem.create({
    data: { contentId, label, position: content._count.checklist },
  });

  revalidatePath(`/content/${contentId}`);
}

export async function deleteChecklistItem(itemId: string) {
  const user = await requireUser();
  const item = await prisma.checklistItem.findFirst({
    where: { id: itemId, content: { userId: user.id } },
    select: { id: true, contentId: true },
  });
  if (!item) return;

  await prisma.checklistItem.delete({ where: { id: itemId } });
  revalidatePath(`/content/${item.contentId}`);
}

export async function createAccount(formData: FormData) {
  const user = await requireUser();
  const label = str(formData, "label");
  if (!label) throw new Error("Nama akun wajib diisi");

  await prisma.socialAccount.create({
    data: {
      userId: user.id,
      label,
      handle: optionalStr(formData, "handle"),
      platform: (str(formData, "platform") || "INSTAGRAM") as Platform,
      color: str(formData, "color") || "#4f46e5",
    },
  });

  revalidatePath("/accounts");
  revalidateAll();
}

export async function updateAccount(id: string, formData: FormData) {
  const user = await requireUser();
  const label = str(formData, "label");
  if (!label) throw new Error("Nama akun wajib diisi");

  const { count } = await prisma.socialAccount.updateMany({
    where: { id, userId: user.id },
    data: {
      label,
      handle: optionalStr(formData, "handle"),
      platform: (str(formData, "platform") || "INSTAGRAM") as Platform,
      color: str(formData, "color") || "#4f46e5",
    },
  });
  if (count === 0) throw new Error("Akun tidak ditemukan");

  revalidatePath("/accounts");
  revalidateAll();
}

export async function deleteAccount(id: string) {
  const user = await requireUser();
  await prisma.socialAccount.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/accounts");
  revalidateAll();
}

export async function updateNotificationSettings(formData: FormData) {
  const user = await requireUser();

  const lead = optionalNumber(formData, "reminderLeadMinutes") ?? 60;
  const hour = optionalNumber(formData, "dailyDigestHour") ?? 7;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      reminderLeadMinutes: Math.min(Math.max(Math.round(lead), 5), 1440),
      dailyDigestHour: Math.min(Math.max(Math.round(hour), 0), 23),
      dailyDigestEnabled: str(formData, "dailyDigestEnabled") === "on",
      timeZone: str(formData, "timeZone") || user.timeZone,
    },
  });

  revalidatePath("/settings");
}

export async function markNotificationsRead() {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  revalidatePath("/notifications");
  revalidatePath("/");
}

/**
 * Turns an AI-generated idea into a real content item, so a good suggestion
 * lands in the pipeline instead of being copied out by hand.
 */
export async function saveIdeaAsContent(input: {
  title: string;
  hook?: string;
  angle?: string;
  outline?: string[];
  tags?: string[];
  format?: string;
  accountId?: string | null;
}) {
  const user = await requireUser();
  const title = input.title.trim();
  if (!title) throw new Error("Judul konten wajib diisi");

  const accountId = await resolveAccountId(user.id, input.accountId ?? null);
  const account = accountId
    ? await prisma.socialAccount.findUnique({
        where: { id: accountId },
        select: { platform: true },
      })
    : null;

  const description = [
    input.angle ? `Sudut pandang: ${input.angle}` : null,
    input.outline?.length ? `Outline:\n${input.outline.map((s) => `- ${s}`).join("\n")}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const item = await prisma.contentItem.create({
    data: {
      userId: user.id,
      accountId,
      title,
      hook: input.hook?.trim() || null,
      description: description || null,
      platform: account?.platform ?? "INSTAGRAM",
      contentType: input.format?.trim() || "Lainnya",
      status: "IDEA",
      tags: (input.tags ?? []).map((t) => t.trim().replace(/^#/, "")).filter(Boolean).slice(0, 12),
      notes: "Dibuat dari saran AI.",
      checklist: {
        create: DEFAULT_CHECKLIST.map((label, position) => ({ label, position })),
      },
    },
    select: { id: true },
  });

  revalidateAll(item.id);
  return { id: item.id };
}

export async function deleteAiThread(threadId: string) {
  const user = await requireUser();
  await prisma.aiThread.deleteMany({ where: { id: threadId, userId: user.id } });
  revalidatePath("/ai");
}
