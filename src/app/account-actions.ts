"use server";

import { redirect } from "next/navigation";
import { destroySession, requireUser, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentClientIdentifier, rateLimit } from "@/lib/rate-limit";

export type DeleteAccountState = { error?: string };

export async function deleteOwnAccount(
  _previous: DeleteAccountState,
  formData: FormData
): Promise<DeleteAccountState> {
  const user = await requireUser();
  const throttle = await rateLimit("account-delete", await currentClientIdentifier(), {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!throttle.allowed) {
    return { error: "Terlalu banyak percobaan. Coba lagi satu jam ke depan." };
  }

  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "").trim().toUpperCase();
  if (confirmation !== "HAPUS") return { error: 'Ketik "HAPUS" untuk mengonfirmasi.' };
  if (!(await verifyPassword(password, user.passwordHash))) {
    return { error: "Password tidak cocok." };
  }

  await prisma.user.delete({ where: { id: user.id } });
  await destroySession();
  redirect("/?account=deleted");
}
