import dns from "node:dns/promises";
import net from "node:net";
import { NextResponse } from "next/server";

const HOST = "ep-fragrant-rain-azy6zb0g.c-3.ap-southeast-1.aws.neon.tech";
const PORT = 5432;

function rawConnect(host: string, address: string, family: number, port: number, timeoutMs: number) {
  return new Promise<{ ok: boolean; error?: string; ms: number }>((resolve) => {
    const start = Date.now();
    const socket = net.createConnection({ host: address, port, family, timeout: timeoutMs });
    socket.once("connect", () => {
      socket.destroy();
      resolve({ ok: true, ms: Date.now() - start });
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve({ ok: false, error: "ETIMEDOUT (socket timeout)", ms: Date.now() - start });
    });
    socket.once("error", (err: NodeJS.ErrnoException) => {
      resolve({ ok: false, error: `${err.code ?? err.name}: ${err.message}`, ms: Date.now() - start });
    });
  });
}

export async function GET() {
  const result: Record<string, unknown> = {
    nodeVersion: process.version,
    dnsResultOrder: (dns as unknown as { getDefaultResultOrder?: () => string }).getDefaultResultOrder?.(),
  };

  try {
    const addresses = await dns.lookup(HOST, { all: true, verbatim: true });
    result.dnsLookup = addresses;

    const attempts = [];
    for (const addr of addresses) {
      const attempt = await rawConnect(HOST, addr.address, addr.family, PORT, 8000);
      attempts.push({ address: addr.address, family: addr.family, ...attempt });
    }
    result.connectAttempts = attempts;
  } catch (err) {
    result.dnsError =
      err instanceof Error ? { code: (err as NodeJS.ErrnoException).code, message: err.message } : String(err);
  }

  return NextResponse.json(result);
}
