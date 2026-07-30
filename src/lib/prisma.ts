import dns from "node:dns";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Confirmed via a raw TCP diagnostic: Prisma's classic query engine (Rust)
// resolves and connects to the datasource host using its own network stack,
// not Node's dns/net — so Node-level DNS preferences like this have no
// effect on it. It's kept here anyway for anything else in the process that
// does go through Node's resolver.
dns.setDefaultResultOrder("ipv4first");

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// The Neon host resolves to both IPv4 and IPv6 addresses. Vercel's
// serverless runtime has no outbound IPv6 route, and Prisma's classic
// engine was failing instantly (~100-200ms, not a timeout) trying an IPv6
// address — surfaced as PrismaClientInitializationError ("Can't reach
// database server"). Raw IPv4 connects in 2-6ms, so the fix is to stop
// using the Rust engine's own resolver: the `pg` driver adapter connects
// through Node's net/dns instead, which respects ipv4first above.
const connectionString = process.env.DATABASE_URL_UNPOOLED
  ? (() => {
      const url = new URL(process.env.DATABASE_URL_UNPOOLED!);
      url.searchParams.set("connect_timeout", "30");
      return url.toString();
    })()
  : undefined;

const adapter = connectionString ? new PrismaPg({ connectionString }) : undefined;

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
