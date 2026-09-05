import "dotenv/config";
import { defineConfig } from "prisma/config";

function connectionString(): string {
  const names = [
    "DIRECT_URL",
    "DATABASE_URL_UNPOOLED",
    "DATABASE_DATABASE_URL_UNPOOLED",
    "POSTGRES_URL_NON_POOLING",
    "DATABASE_POSTGRES_URL_NON_POOLING",
    "DATABASE_URL",
  ];
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(
    `No database connection string found. Set one of: ${names.join(", ")}.`
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  engine: "classic",
  datasource: {
    url: connectionString(),
    directUrl: connectionString(),
  },
});
