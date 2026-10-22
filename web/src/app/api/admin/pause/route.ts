import { NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/db";
import { guard, chainError } from "@/lib/guard";
import { contractFor } from "@/lib/chain";

export async function POST(req: Request) {
  const g = await guard("admin");
  if ("res" in g) return g.res;
  const parsed = z.object({ paused: z.boolean() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    const c = contractFor(0);
    const tx = parsed.data.paused ? await c.pause() : await c.unpause();
    await tx.wait();
    audit(g.s.username, parsed.data.paused ? "PAUSE_SYSTEM" : "UNPAUSE_SYSTEM", `tx=${tx.hash}`);
    return NextResponse.json({ ok: true, txHash: tx.hash });
  } catch (e) {
    return NextResponse.json({ error: chainError(e) }, { status: 400 });
  }
}