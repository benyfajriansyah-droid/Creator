import "server-only";

/**
 * Email is optional. Without a provider configured the app still works — the
 * reset link just has to be handed over another way (see /admin/plans), which
 * is the realistic state before a sending domain has been set up.
 */
export function isMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

const DEFAULT_FROM = "Creator Studio <onboarding@resend.dev>";

/**
 * Sends through Resend's REST API directly — one POST, no SDK to keep in sync.
 * Returns whether it went out; callers should not surface the difference to
 * the person requesting, so a failure can't be used to probe for accounts.
 */
export async function sendMail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || DEFAULT_FROM,
        to,
        subject,
        text,
      }),
    });

    if (!response.ok) {
      console.error("Gagal mengirim email", response.status, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("Gagal mengirim email", error);
    return false;
  }
}
