import "server-only";
import crypto from "node:crypto";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

/**
 * Secrets live in the database rather than environment variables so the app
 * works on a fresh deployment with nothing but a DATABASE_URL. They are
 * generated once, on first use, and reused from then on.
 */
async function getOrCreateSecret(key: string, generate: () => string): Promise<string> {
  const existing = await prisma.appSecret.findUnique({ where: { key } });
  if (existing) return existing.value;

  const value = generate();
  // Two concurrent requests can race here; whoever loses the race just reads
  // back the winner's value.
  const created = await prisma.appSecret.upsert({
    where: { key },
    create: { key, value },
    update: {},
  });
  return created.value;
}

let sessionKeyCache: Uint8Array | null = null;

export async function getSessionKey(): Promise<Uint8Array> {
  if (sessionKeyCache) return sessionKeyCache;
  const secret = await getOrCreateSecret("session_signing_key", () =>
    crypto.randomBytes(48).toString("base64url")
  );
  sessionKeyCache = new TextEncoder().encode(secret);
  return sessionKeyCache;
}

export type VapidKeys = { publicKey: string; privateKey: string };

let vapidCache: VapidKeys | null = null;

export async function getVapidKeys(): Promise<VapidKeys> {
  if (vapidCache) return vapidCache;
  const serialised = await getOrCreateSecret("vapid_keys", () =>
    JSON.stringify(webpush.generateVAPIDKeys())
  );
  vapidCache = JSON.parse(serialised) as VapidKeys;
  return vapidCache;
}
