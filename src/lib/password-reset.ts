import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

/** How long a reset link stays usable. Short, since it's e-mailed in the clear. */
const TOKEN_TTL_MINUTES = 60;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Issues a reset ticket for an account, returning the raw token — the only
 * moment it exists in readable form. Any earlier unused tickets for the same
 * account are dropped, so a fresh request always invalidates the previous link.
 *
 * Returns null when no such account exists. Callers must not let that show:
 * a different response for a missing email turns this into a way to find out
 * who has an account here.
 */
export async function createResetToken(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true },
  });
  if (!user) return null;

  const token = crypto.randomBytes(32).toString("base64url");

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000),
      },
    }),
  ]);

  return token;
}

export type ResetOutcome = "OK" | "INVALID" | "EXPIRED" | "USED";

/** Spends a reset ticket and sets the new password, or explains why it can't. */
export async function consumeResetToken(
  token: string,
  newPassword: string
): Promise<ResetOutcome> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!record) return "INVALID";
  if (record.usedAt) return "USED";
  if (record.expiresAt < new Date()) return "EXPIRED";

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(newPassword) },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Anything else outstanding for this account is now moot.
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId, usedAt: null },
    }),
  ]);

  return "OK";
}

/** Whether a token could still be spent, checked before showing the form. */
export async function isResetTokenUsable(token: string): Promise<boolean> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { expiresAt: true, usedAt: true },
  });
  return Boolean(record && !record.usedAt && record.expiresAt > new Date());
}
