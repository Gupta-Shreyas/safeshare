import { NextResponse } from "next/server";
import { destroySession, getSession } from "@/lib/auth";
import { audit } from "@/lib/db";

export async function POST() {
  const s = await getSession();
  await destroySession();
  if (s) audit(s.username, "LOGOUT");
  return NextResponse.json({ ok: true });
}