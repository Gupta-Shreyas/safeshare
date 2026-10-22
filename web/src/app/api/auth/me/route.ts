import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  return NextResponse.json({ user: { username: s.username, role: s.role, address: s.address } });
}