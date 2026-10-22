import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guard } from "@/lib/guard";

export async function GET() {
  const g = await guard("admin");
  if ("res" in g) return g.res;
  const logs = db.prepare("SELECT id, ts, actor, action, detail, ip FROM audit_log ORDER BY id DESC LIMIT 100").all();
  return NextResponse.json({ logs });
}