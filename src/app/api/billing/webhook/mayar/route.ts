import { NextResponse } from "next/server";
import { applyMayarWebhookPayload } from "@/lib/billing";

export const dynamic = "force-dynamic";

/**
 * Mayar (like most Indonesian payment gateways) doesn't document a request
 * signature scheme we could verify against, so this endpoint is protected by
 * a shared secret in the URL itself instead — set this exact URL
 * (https://yourdomain/api/billing/webhook/mayar?token=...) as the webhook
 * target in the Mayar dashboard, using the same value as MAYAR_WEBHOOK_TOKEN.
 */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const expected = process.env.MAYAR_WEBHOOK_TOKEN;

  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
  }

  try {
    await applyMayarWebhookPayload(payload);
  } catch (error) {
    console.error("Gagal memproses webhook Mayar", error);
    return NextResponse.json({ error: "Gagal memproses webhook" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
