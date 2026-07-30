import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Neon's free-tier compute suspends when idle and has to wake up on the
// next connection, which can take longer than Prisma's default connect
// timeout — that showed up as PrismaClientInitializationError ("Can't
// reach database server") on cold requests. Give it more time to wake up.
function withConnectTimeout(url: string, seconds: number): string {
  const withTimeout = new URL(url);
  withTimeout.searchParams.set("connect_timeout", String(seconds));
  return withTimeout.toString();
}

const datasourceUrl = process.env.DATABASE_URL_UNPOOLED
  ? withConnectTimeout(process.env.DATABASE_URL_UNPOOLED, 30)
  : undefined;

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
