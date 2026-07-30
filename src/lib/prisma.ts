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

/**
 * Which variable actually holds the connection string depends on how the
 * database was attached: Vercel's Neon integration prefixes the names it
 * creates, so the plain spellings aren't always present.
 *
 * DIRECT_URL comes first deliberately. It's the one set for this app by hand,
 * so it's the one that gets corrected when credentials change — the
 * integration's own variables can keep serving a stale password after a
 * database password reset, which failed here as P1000 ("Authentication failed
 * against database server") on every query while migrations, which read
 * DIRECT_URL, kept working. Keep this list in the same order as the one in
 * prisma.config.ts, so the build and the running app agree on which database
 * they're talking to.
 */
const CONNECTION_ENV_VARS = [
  "DIRECT_URL",
  "DATABASE_URL_UNPOOLED",
  "DATABASE_DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
];

function resolveConnectionString(): string | null {
  for (const name of CONNECTION_ENV_VARS) {
    const value = process.env[name];
    if (!value) continue;
    try {
      const url = new URL(value);
      // Neon scales to zero, so the first connection after an idle period
      // has to wait for the compute to wake up.
      url.searchParams.set("connect_timeout", "30");
      // Name only, never the value — enough to tell which variable is in play
      // when credentials turn out to be wrong.
      console.info(`Database connection string taken from ${name}.`);
      return url.toString();
    } catch {
      // Not a URL — e.g. a bare hostname pasted by mistake. Keep looking.
      console.error(`${name} is not a valid connection string, ignoring it.`);
    }
  }
  return null;
}

const connectionString = resolveConnectionString();

if (!connectionString) {
  console.error(
    `No database connection string found. Set one of: ${CONNECTION_ENV_VARS.join(", ")}.`
  );
}

// The Neon host resolves to both IPv4 and IPv6 addresses. Vercel's serverless
// runtime has no outbound IPv6 route, and Prisma's classic engine was failing
// instantly (~100-200ms, not a timeout) trying an IPv6 address — surfaced as
// PrismaClientInitializationError ("Can't reach database server"). Raw IPv4
// connects in 2-6ms, so the fix is to stop using the Rust engine's own
// resolver: the `pg` driver adapter connects through Node's net/dns instead,
// which respects ipv4first above.
//
// This must be null rather than undefined when there's no adapter to give —
// the constructor rejects `adapter: undefined` outright, which took down every
// request that touched the database.
const adapter = connectionString ? new PrismaPg({ connectionString }) : null;

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
