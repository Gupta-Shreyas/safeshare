import { NextResponse } from "next/server";
import { guard } from "@/lib/guard";
import { readContract } from "@/lib/chain";

export async function GET() {
  const g = await guard();
  if ("res" in g) return g.res;
  try {
    const c = readContract();
    const role = await c.VERIFIED_ROLE();
    const a = g.s.address;
    const [verified, blacklisted, credits, st] = await Promise.all([
      c.hasRole(role, a),
      c.blacklisted(a),
      c.credits(a),
      c.stats(a),
    ]);
    return NextResponse.json({
      username: g.s.username,
      role: g.s.role,
      address: a,
      verified,
      blacklisted,
      credits: Number(credits),
      stats: {
        completed: Number(st.completed),
        onTime: Number(st.onTime),
        damaged: Number(st.damaged),
        disputesLost: Number(st.disputesLost),
        lent: Number(st.lent),
        careCount: Number(st.careCount),
        careSum: Number(st.careSum),
      },
    });
  } catch {
    return NextResponse.json({ error: "Blockchain node not reachable" }, { status: 503 });
  }
}