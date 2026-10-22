import { NextResponse } from "next/server";
import { z } from "zod";
import { db, audit } from "@/lib/db";
import { guard, chainError } from "@/lib/guard";
import { contractFor } from "@/lib/chain";

export async function POST(req: Request) {
  const g = await guard("admin");
  if ("res" in g) return g.res;
  const parsed = z.object({ username: z.string().min(1).max(24) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const u = db.prepare("SELECT username, address FROM users WHERE username = ?").get(parsed.data.username);
  if (!u) return NextResponse.json({ error: "User not found" }, { status: 404 });
  try {
    const tx = await contractFor(0).verifyUser(u.address);
    await tx.wait();
    audit(g.s.username, "VERIFY_USER", `${u.username} tx=${tx.hash}`);
    return NextResponse.json({ ok: true, txHash: tx.hash });
  } catch (e) {
    return NextResponse.json({ error: chainError(e) }, { status: 400 });
  }
}