import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function clientIdentifier(value: Headers): string {
  const forwarded = value.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || value.get("x-real-ip") || "unknown";
  return hash(ip);
}

export async function currentClientIdentifier(): Promise<string> {
  return clientIdentifier(await headers());
}

/**
 * Atomic, database-backed fixed-window limiter. The SQL performs the increment
 * in one statement, so parallel serverless instances cannot bypass the limit.
 */
export async function rateLimit(
  scope: string,
  identifier: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + options.windowMs);
  const key = `${scope}:${hash(identifier)}`;

  const rows = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>(Prisma.sql`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt", "updatedAt")
    VALUES (${key}, 1, ${resetAt}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."resetAt" <= ${now} THEN 1
        ELSE "RateLimitBucket"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimitBucket"."resetAt" <= ${now} THEN ${resetAt}
        ELSE "RateLimitBucket"."resetAt"
      END,
      "updatedAt" = ${now}
    RETURNING "count", "resetAt"
  `);

  const bucket = rows[0];
  const count = bucket?.count ?? options.limit + 1;
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil(((bucket?.resetAt ?? resetAt).getTime() - now.getTime()) / 1000)
  );

  return {
    allowed: count <= options.limit,
    remaining: Math.max(0, options.limit - count),
    retryAfterSeconds,
  };
}

export async function pruneExpiredRateLimits(): Promise<void> {
  await prisma.rateLimitBucket.deleteMany({
    where: { resetAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
}
