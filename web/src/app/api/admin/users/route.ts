import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guard } from "@/lib/guard";
import { readContract } from "@/lib/chain";

export async function GET() {
  const g = await guard("admin");
  if ("res" in g) return g.res;
  try {
    const rows = db
      .prepare("SELECT id, username, email, role, account_index, address, created_at FROM users ORDER BY id")
      .all();
    const c = readContract();
    const role = await c.VERIFIED_ROLE();
    const users = await Promise.all(
      rows.map(async (r: any) => ({
        ...r,
        verified: await c.hasRole(role, r.address),
        blacklisted: await c.blacklisted(r.address),
        credits: Number(await c.credits(r.address)),
      }))
    );
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: "Blockchain node not reachable" }, { status: 503 });
  }
}