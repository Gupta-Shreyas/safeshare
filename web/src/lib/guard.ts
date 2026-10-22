import { NextResponse } from "next/server";
import { getSession, Session } from "./auth";
import { audit } from "./db";

export async function guard(role?: "admin"): Promise<{ s: Session } | { res: NextResponse }> {
  const s = await getSession();
  if (!s) return { res: NextResponse.json({ error: "Not logged in" }, { status: 401 }) };
  if (role === "admin" && s.role !== "admin") {
    audit(s.username, "FORBIDDEN", "tried an admin-only route");
    return { res: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  }
  return { s };
}

// Pull the human-readable revert reason out of an ethers error.
export function chainError(e: unknown): string {
  const x = e as { reason?: string; shortMessage?: string };
  return x?.reason ?? x?.shortMessage ?? "Transaction failed";
}