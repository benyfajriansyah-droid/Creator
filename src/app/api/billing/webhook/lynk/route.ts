import { NextResponse } from "next/server";
import { applyLynkWebhookPayload } from "@/lib/billing";

export const dynamic = "force-dynamic";

/**
 * lynk.id doesn't document a request signature we could verify, so this
 * endpoint is protected by a shared secret in the URL instead — register this
 * exact URL (https://yourdomain/api/billing/webhook/lynk?token=...) as the
 * webhook target in the lynk.id dashboard, using the same value as
 * LYNK_WEBHOOK_TOKEN.
 */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const expected = process.env.LYNK_WEBHOOK_TOKEN;

  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
  }

  try {
    await applyLynkWebhookPayload(payload);
  } catch (error) {
    console.error("Gagal memproses webhook lynk.id", error);
    return NextResponse.json({ error: "Gagal memproses webhook" }, { status: 500 });
  }

  // Always 200 once authenticated: a payload we couldn't match is a case for
  // manual confirmation, not something lynk.id should keep retrying.
  return NextResponse.json({ ok: true });
}
