import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendPush } from "@/lib/notify";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await sendPush({
    userId: user.id,
    title: "Notifikasi aktif 🎉",
    body: "Beginilah tampilan pengingat jadwal kontenmu nanti.",
    href: "/",
  });

  return NextResponse.json({ ok: true });
}
