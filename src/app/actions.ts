"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { ContentStatus, Platform } from "@/generated/prisma/client";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function optionalStr(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v.length > 0 ? v : null;
}

function optionalDate(formData: FormData, key: string): Date | null {
  const v = str(formData, key);
  return v.length > 0 ? new Date(v) : null;
}

function optionalNumber(formData: FormData, key: string): number | null {
  const v = str(formData, key);
  if (v.length === 0) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function createContent(formData: FormData) {
  const title = str(formData, "title");
  if (!title) throw new Error("Judul konten wajib diisi");

  const scheduledAt = optionalDate(formData, "scheduledAt");
  const status = str(formData, "status") as ContentStatus;

  const item = await prisma.contentItem.create({
    data: {
      title,
      description: optionalStr(formData, "description"),
      platform: str(formData, "platform") as Platform,
      contentType: str(formData, "contentType") || "Lainnya",
      status: status || (scheduledAt ? "SCHEDULED" : "IDEA"),
      scheduledAt,
      notes: optionalStr(formData, "notes"),
    },
  });

  revalidatePath("/");
  revalidatePath("/content");
  revalidatePath("/calendar");
  redirect(`/content/${item.id}`);
}

export async function updateContent(id: string, formData: FormData) {
  const title = str(formData, "title");
  if (!title) throw new Error("Judul konten wajib diisi");

  const scheduledAt = optionalDate(formData, "scheduledAt");

  await prisma.contentItem.update({
    where: { id },
    data: {
      title,
      description: optionalStr(formData, "description"),
      platform: str(formData, "platform") as Platform,
      contentType: str(formData, "contentType") || "Lainnya",
      status: str(formData, "status") as ContentStatus,
      scheduledAt,
      notes: optionalStr(formData, "notes"),
    },
  });

  revalidatePath("/");
  revalidatePath("/content");
  revalidatePath("/calendar");
  revalidatePath(`/content/${id}`);
}

export async function logMetrics(id: string, formData: FormData) {
  const publishedAt = optionalDate(formData, "publishedAt") ?? new Date();

  await prisma.contentItem.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      publishedAt,
      views: optionalNumber(formData, "views"),
      likes: optionalNumber(formData, "likes"),
      comments: optionalNumber(formData, "comments"),
      shares: optionalNumber(formData, "shares"),
      saves: optionalNumber(formData, "saves"),
      hoursSpent: optionalNumber(formData, "hoursSpent"),
      revenue: optionalNumber(formData, "revenue"),
    },
  });

  revalidatePath("/");
  revalidatePath("/content");
  revalidatePath("/calendar");
  revalidatePath(`/content/${id}`);
}

export async function deleteContent(id: string) {
  await prisma.contentItem.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/content");
  revalidatePath("/calendar");
  redirect("/content");
}
