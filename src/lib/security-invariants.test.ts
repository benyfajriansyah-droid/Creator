import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

describe("paid-product security invariants", () => {
  const aiRoutes = ["assist", "chat", "generate", "repurpose", "review"];

  it.each(aiRoutes)("protects and throttles the %s AI route", (route) => {
    const source = read(`app/api/ai/${route}/route.ts`);
    expect(source).toContain("getCurrentUser");
    expect(source).toContain("rateLimit(");
    expect(source).toContain("reserveAiQuota(");
  });

  it("fails the production cron closed without CRON_SECRET", () => {
    const source = read("app/api/cron/reminders/route.ts");
    expect(source).toContain('!secret && process.env.NODE_ENV === "production"');
    expect(source).toContain('status: 503');
  });

  it("does not expose password hashes in account exports", () => {
    const source = read("app/api/account/export/route.ts");
    expect(source).not.toContain("passwordHash:");
    expect(source).toContain('"Cache-Control": "private, no-store"');
  });

  it("keeps ownership checks on content mutations", () => {
    const source = read("app/actions.ts");
    expect(source.match(/userId: user\.id/g)?.length ?? 0).toBeGreaterThanOrEqual(10);
    expect(source).toContain("deleteMany({\n    where: { id, userId: user.id }");
  });
});
